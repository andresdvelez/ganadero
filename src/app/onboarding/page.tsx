"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { bindDeviceLocally, provisionFromClerk } from "@/lib/auth/offline-auth";
import { addToast } from "@/components/ui/toast";
import { robustDeviceId } from "@/lib/utils";

type WizardStep = "org" | "farm" | "confirm";

function slugify(input: string): string {
  const accentMap: Record<string, string> = {
    á: "a",
    é: "e",
    í: "i",
    ó: "o",
    ú: "u",
    ñ: "n",
    ü: "u",
  };
  const normalized = input
    .toLowerCase()
    .trim()
    .replace(/[áéíóúñü]/g, (m) => accentMap[m] || m)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { isLoaded, user } = useUser();
  const utils = trpc.useUtils();

  // Estado local (borradores) — no se crea nada hasta confirmar
  const [current, setCurrent] = useState<WizardStep>("org");
  const [orgDraft, setOrgDraft] = useState<{ name: string }>({ name: "" });
  const [farmDraft, setFarmDraft] = useState<{ name: string; code: string }>(
    { name: "", code: "" }
  );
  const [deviceLinked, setDeviceLinked] = useState(false);
  const [passA, setPassA] = useState("");
  const [passB, setPassB] = useState("");
  const [created, setCreated] = useState<
    | null
    | { orgId: string; orgName: string; farmId: string; farmName: string; farmCode: string }
  >(null);

  // Autorellenar código de finca a partir del nombre (prefijo fn-)
  useEffect(() => {
    if (!farmDraft.name) return;
    const base = slugify(farmDraft.name);
    // Solo autocompletar si el usuario no lo ha modificado manualmente
    setFarmDraft((prev) => {
      const userModified = prev.code && !prev.code.startsWith("fn-");
      return userModified ? prev : { ...prev, code: base ? `fn-${base}` : "" };
    });
  }, [farmDraft.name]);

  // Para usuarios que ya tienen organización, los mostramos pero mantenemos el wizard
  const { data: myOrgs } = trpc.org.myOrganizations.useQuery(undefined, {
    enabled: isLoaded,
  });
  const alreadyHasOrg = (myOrgs?.length || 0) > 0;

  // Mutaciones finales (se disparan solo en confirmar)
  const createOrg = trpc.org.createOrganization.useMutation();
  const createFarm = trpc.farm.create.useMutation();
  const registerDevice = trpc.device.register.useMutation();
  const setPassStatus = trpc.device.setPasscodeStatus.useMutation();

  const deviceId = useMemo(() => robustDeviceId(), []);

  async function handleLinkDevice(orgId?: string) {
    if (!user) return;
    try {
      // 0) Asegurar que el dispositivo quede vinculado LOCALMENTE al usuario actual
      await bindDeviceLocally({
        deviceId,
        clerkId: user.id,
        name: "Este equipo",
        platform: typeof navigator !== "undefined" ? navigator.platform : "web",
        orgId,
      });

      // 1) Si el usuario ingresó passcode, provisionar identidad offline local
      if (passA || passB) {
        if (passA.length < 6) {
          addToast({ variant: "warning", title: "La clave debe tener al menos 6 caracteres" });
          return;
        }
        if (passA !== passB) {
          addToast({ variant: "warning", title: "Las claves no coinciden" });
          return;
        }
        await provisionFromClerk({
          clerkId: user.id,
          email: user.primaryEmailAddress?.emailAddress,
          name: user.fullName ?? undefined,
          avatarUrl: user.imageUrl,
          orgId,
          passcode: passA,
        });
      }

      // 2) Registrar dispositivo en backend
      await registerDevice.mutateAsync({
        deviceId,
        name: "Este equipo",
        platform: typeof navigator !== "undefined" ? navigator.platform : "web",
        orgId,
      });
      if (passA && passA.length >= 6) {
        try {
          await setPassStatus.mutateAsync({ deviceId, hasPasscode: true });
        } catch {}
      }
      await bindDeviceLocally({
        deviceId,
        clerkId: user.id,
        name: "Este equipo",
        platform: typeof navigator !== "undefined" ? navigator.platform : "web",
      });
      setDeviceLinked(true);
      addToast({ variant: "success", title: "Dispositivo vinculado" });
    } catch (e: any) {
      addToast({ variant: "error", title: "No se pudo vincular", description: e?.message });
    }
  }

  async function handleConfirmAndCreate() {
    try {
      // Crear organización si el usuario no tenía
      let orgId: string | null = null;
      let orgName: string = orgDraft.name;
      if (!alreadyHasOrg) {
        if (!orgDraft.name || orgDraft.name.trim().length < 2) {
          addToast({ variant: "warning", title: "Escribe el nombre de la organización" });
          setCurrent("org");
          return;
        }
        const org = await createOrg.mutateAsync({ name: orgDraft.name.trim() });
        orgId = org.id;
        orgName = org.name;
        await utils.org.myOrganizations.invalidate();
      } else {
        // Si ya tiene, usar la primera
        orgId = myOrgs?.[0]?.id ?? null;
        orgName = myOrgs?.[0]?.name ?? orgDraft.name;
      }

      if (!orgId) throw new Error("No se obtuvo organización");

      // Crear finca
      if (!farmDraft.name || !farmDraft.code) {
        addToast({ variant: "warning", title: "Completa nombre y código de la finca" });
        setCurrent("farm");
        return;
      }
      const farm = await createFarm.mutateAsync({
        orgId,
        code: farmDraft.code,
        name: farmDraft.name.trim(),
      } as any);
      try {
        window.localStorage.setItem("ACTIVE_FARM_ID", farm.id);
      } catch {}
      await utils.farm.list.invalidate();

      // Si el usuario ya decidió vincular antes y aún no hay org asociada en el device, lo puede repetir con org
      if (deviceLinked && registerDevice.isSuccess && !registerDevice.data?.orgId) {
        try {
          await registerDevice.mutateAsync({ deviceId, orgId });
        } catch {}
      }

      setCreated({
        orgId,
        orgName,
        farmId: (farm as any).id,
        farmName: farmDraft.name.trim(),
        farmCode: farmDraft.code,
      });
      addToast({ variant: "success", title: "¡Todo listo!" });
    } catch (e: any) {
      addToast({ variant: "error", title: "No se pudo completar", description: e?.message });
    }
  }

  if (!isLoaded) return null;

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-[260px,1fr] gap-6">
        <aside className="bg-white border rounded-2xl p-4 h-fit">
          <div className="text-xs uppercase tracking-wide text-neutral-500 mb-3">Onboarding</div>
          <nav className="space-y-2">
            <StepItem index={1} title="Organización" active={current === "org"} done={current !== "org" && (!!orgDraft.name || alreadyHasOrg)} onClick={() => setCurrent("org")} />
            <StepItem index={2} title="Finca" active={current === "farm"} done={current === "confirm" || (!!farmDraft.name && !!farmDraft.code)} onClick={() => setCurrent("farm")} />
            <StepItem index={3} title="Vincular & Confirmar" active={current === "confirm"} done={!!created} onClick={() => setCurrent("confirm")} />
          </nav>
        </aside>

        <main className="space-y-4">
          {current === "org" && (
            <Card>
              <CardContent>
                <h2 className="text-xl font-semibold mb-2">Paso 1: Crea tu organización</h2>
                {alreadyHasOrg ? (
                  <p className="text-neutral-600">Ya perteneces a <span className="font-medium">{myOrgs?.[0]?.name}</span>. Puedes continuar.</p>
                ) : (
                  <div className="grid gap-3 max-w-md">
                    <Input
                      label="Nombre de la organización"
                      placeholder="Ganadera La Primavera"
                      value={orgDraft.name}
                      onChange={(e) => setOrgDraft({ name: (e.target as HTMLInputElement).value })}
                      required
                    />
                    <div className="flex justify-end">
                      <Button color="primary" onPress={() => setCurrent("farm")}>Continuar</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {current === "farm" && (
            <Card>
              <CardContent>
                <h2 className="text-xl font-semibold mb-2">Paso 2: Tu primera finca</h2>
                <div className="grid gap-3 max-w-md">
                  <Input
                    label="Nombre de la finca"
                    placeholder="Hacienda La Esmeralda"
                    value={farmDraft.name}
                    onChange={(e) => setFarmDraft({ ...farmDraft, name: (e.target as HTMLInputElement).value })}
                    required
                  />
                  <Input
                    label="Código de la finca"
                    placeholder="fn-hacienda-la-esmeralda"
                    value={farmDraft.code}
                    onChange={(e) => setFarmDraft({ ...farmDraft, code: (e.target as HTMLInputElement).value })}
                    required
                  />
                  <div className="text-xs text-neutral-500">Se genera automáticamente a partir del nombre. Puedes editarlo si lo prefieres.</div>
                  <div className="flex justify-between">
                    <Button variant="flat" onPress={() => setCurrent("org")}>Atrás</Button>
                    <Button color="primary" onPress={() => setCurrent("confirm")}>Continuar</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {current === "confirm" && (
            <Card>
              <CardContent>
                <h2 className="text-xl font-semibold mb-3">Paso 3: Vincula tu dispositivo y confirma</h2>
                {!created ? (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                      <div className="text-sm font-medium">Resumen</div>
                      <div className="rounded-xl border p-3 bg-white">
                        <div className="text-xs uppercase text-neutral-500 mb-2">Organización</div>
                        <Input
                          label="Nombre"
                          placeholder="Ganadera La Primavera"
                          value={alreadyHasOrg ? myOrgs?.[0]?.name ?? "" : orgDraft.name}
                          onChange={(e) => !alreadyHasOrg && setOrgDraft({ name: (e.target as HTMLInputElement).value })}
                          disabled={alreadyHasOrg}
                        />
                        <div className="h-3" />
                        <div className="text-xs uppercase text-neutral-500 mb-2">Finca</div>
                        <Input
                          label="Nombre"
                          placeholder="Hacienda La Esmeralda"
                          value={farmDraft.name}
                          onChange={(e) => setFarmDraft({ ...farmDraft, name: (e.target as HTMLInputElement).value })}
                        />
                        <div className="h-2" />
                        <Input
                          label="Código"
                          placeholder="fn-hacienda-la-esmeralda"
                          value={farmDraft.code}
                          onChange={(e) => setFarmDraft({ ...farmDraft, code: (e.target as HTMLInputElement).value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="text-sm font-medium">Vincular dispositivo</div>
                      <div className="rounded-xl border p-3 bg-white">
                        <p className="text-neutral-600 mb-2 text-sm">Vincula este equipo para acceso sin conexión. Puedes crear una clave local ahora o saltar este paso.</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                          <Input
                            type="password"
                            label="Clave local (mín. 6)"
                            placeholder="••••••"
                            value={passA}
                            onChange={(e) => setPassA((e.target as HTMLInputElement).value)}
                          />
                          <Input
                            type="password"
                            label="Confirmar clave"
                            placeholder="••••••"
                            value={passB}
                            onChange={(e) => setPassB((e.target as HTMLInputElement).value)}
                          />
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <Button asChild>
                            <a href="/download" target="_blank" rel="noreferrer">Descargar app</a>
                          </Button>
                          <Button
                            color="secondary"
                            isLoading={registerDevice.isPending}
                            onPress={() => handleLinkDevice(undefined)}
                          >
                            Vincular este dispositivo
                          </Button>
                        </div>
                        {deviceLinked && (
                          <div className="mt-2 text-xs text-green-700">Dispositivo vinculado correctamente.</div>
                        )}
                      </div>

                      <div className="flex justify-between pt-1">
                        <Button variant="flat" onPress={() => setCurrent("farm")}>Atrás</Button>
                        <Button color="primary" onPress={handleConfirmAndCreate} isLoading={createOrg.isPending || createFarm.isPending}>Crear y continuar</Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="rounded-xl border p-4 bg-white">
                      <div className="text-sm font-semibold mb-2">¡Listo! Se creó tu espacio</div>
                      <div className="text-sm text-neutral-700">Organización: <span className="font-medium">{created.orgName}</span></div>
                      <div className="text-sm text-neutral-700">Finca: <span className="font-medium">{created.farmName}</span> (<span className="font-mono">{created.farmCode}</span>)</div>
                    </div>
                    <div className="rounded-xl border p-4 bg-white">
                      <div className="text-sm font-semibold mb-2">Vincular dispositivo</div>
                      <div className="flex gap-2 flex-wrap">
                        <Button asChild>
                          <a href="/download" target="_blank" rel="noreferrer">Descargar app</a>
                        </Button>
                        <Button color="secondary" onPress={() => handleLinkDevice(created.orgId)} isLoading={registerDevice.isPending}>
                          {deviceLinked ? "Vinculado" : "Vincular este dispositivo"}
                        </Button>
                      </div>
                      {deviceLinked && (
                        <div className="mt-2 text-xs text-green-700">Dispositivo vinculado correctamente.</div>
                      )}
                    </div>
                    <div className="md:col-span-2 flex justify-end">
                      <Button color="primary" onPress={() => router.replace("/")}>Ir al dashboard</Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </div>
  );
}

function StepItem({
  index,
  title,
  active,
  done,
  onClick,
}: {
  index: number;
  title: string;
  active: boolean;
  done: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left px-3 py-2 rounded-xl border transition-all ${
        active
          ? "bg-primary-50 border-primary-200 text-primary-700"
          : done
          ? "bg-white border-neutral-200 text-neutral-700"
          : "bg-white border-neutral-200 text-neutral-500"
      }`}
    >
      <div className="flex items-center gap-2">
        <div
          className={`w-6 h-6 grid place-items-center rounded-full text-xs font-semibold ${
            done ? "bg-green-600 text-white" : active ? "bg-primary-600 text-white" : "bg-neutral-200 text-neutral-700"
          }`}
        >
          {done ? "✓" : index}
        </div>
        <div className="text-sm font-medium">{title}</div>
      </div>
    </button>
  );
}
