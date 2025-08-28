"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { bindDeviceLocally } from "@/lib/auth/offline-auth";
import { addToast } from "@/components/ui/toast";
import { robustDeviceId } from "@/lib/utils";

export default function OnboardingPage() {
  const router = useRouter();
  const { isLoaded } = useUser();
  const utils = trpc.useUtils();

  const { data: orgs } = trpc.org.myOrganizations.useQuery(undefined, {
    enabled: isLoaded,
  });

  const hasOrg = !!orgs && orgs.length > 0;
  const firstOrgId = useMemo(() => orgs?.[0]?.id ?? null, [orgs]);

  const farmsQ = trpc.farm.list.useQuery(
    { orgId: firstOrgId || "" },
    { enabled: !!firstOrgId }
  );

  useEffect(() => {
    if (!isLoaded) return;
    if (hasOrg) return; // stay until user links device
  }, [isLoaded, hasOrg]);

  if (!isLoaded) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-lg space-y-6">
        <OrgStep onCreated={() => utils.org.myOrganizations.invalidate()} />
        {hasOrg && (
          <CreateFarmStep
            orgId={firstOrgId || ""}
            hasAnyFarm={(farmsQ.data?.length || 0) > 0}
            onCreated={async () => {
              await utils.farm.list.invalidate();
            }}
          />
        )}
        {hasOrg && <LinkDeviceStep />}
      </div>
    </div>
  );
}

function OrgStep({ onCreated }: { onCreated: () => void }) {
  const { data: orgs } = trpc.org.myOrganizations.useQuery();
  const createOrg = trpc.org.createOrganization.useMutation({
    onError(error) {
      addToast({
        variant: "error",
        title: "No se pudo crear",
        description: error.message,
      });
    },
    onSuccess() {
      addToast({ variant: "success", title: "Organización creada" });
    },
  });
  const [name, setName] = useState("");

  const hasOrg = !!orgs && orgs.length > 0;

  return (
    <Card>
      <CardContent>
        <h2 className="text-lg font-semibold mb-2">1) Crear organización</h2>
        {hasOrg ? (
          <p className="text-neutral-600">Ya perteneces a una organización.</p>
        ) : (
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              await createOrg.mutateAsync({ name });
              onCreated();
            }}
          >
            <Input
              label="Nombre de la organización"
              placeholder="Mi finca"
              value={name}
              onChange={(e) => setName((e.target as HTMLInputElement).value)}
              required
            />
            <Button
              type="submit"
              color="primary"
              isLoading={createOrg.isPending}
            >
              Crear organización
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

function CreateFarmStep({
  orgId,
  hasAnyFarm,
  onCreated,
}: {
  orgId: string;
  hasAnyFarm: boolean;
  onCreated: () => void | Promise<void>;
}) {
  const [form, setForm] = useState({ code: "", name: "" });
  const router = useRouter();
  const createFarm = trpc.farm.create.useMutation({
    async onSuccess(f) {
      addToast({ variant: "success", title: "Finca creada" });
      try {
        window.localStorage.setItem("ACTIVE_FARM_ID", f.id);
      } catch {}
      await onCreated();
      // Ir al dashboard principal para que el header cargue la finca
      router.replace("/");
    },
    onError(e) {
      addToast({
        variant: "error",
        title: "No se pudo crear",
        description: e.message,
      });
    },
  });

  if (hasAnyFarm) {
    return (
      <Card>
        <CardContent>
          <h2 className="text-lg font-semibold mb-2">2) Finca</h2>
          <p className="text-neutral-600">Ya tienes al menos una finca.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <h2 className="text-lg font-semibold mb-2">
          2) Crear tu primera finca
        </h2>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!form.code || !form.name) {
              addToast({
                variant: "warning",
                title: "Completa código y nombre",
              });
              return;
            }
            createFarm.mutate({
              orgId,
              code: form.code,
              name: form.name,
            } as any);
          }}
        >
          <Input
            label="Código"
            placeholder="LD-001"
            value={form.code}
            onChange={(e) =>
              setForm({ ...form, code: (e.target as HTMLInputElement).value })
            }
            required
          />
          <Input
            label="Nombre"
            placeholder="Hacienda La Esmeralda"
            value={form.name}
            onChange={(e) =>
              setForm({ ...form, name: (e.target as HTMLInputElement).value })
            }
            required
          />
          <div className="flex justify-end">
            <Button
              color="primary"
              type="submit"
              isLoading={createFarm.isPending}
            >
              Crear finca
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function LinkDeviceStep() {
  const { user } = useUser();
  const registerDevice = trpc.device.register.useMutation({
    onError(error) {
      addToast({
        variant: "error",
        title: "No se pudo vincular",
        description: error.message,
      });
    },
    onSuccess() {
      addToast({ variant: "success", title: "Dispositivo vinculado" });
    },
  });

  const deviceId = useMemo(() => robustDeviceId(), []);

  return (
    <Card>
      <CardContent>
        <h2 className="text-lg font-semibold mb-2">
          2) Vincular dispositivo y descargar app
        </h2>
        <p className="text-neutral-600 mb-3">
          Vincula este equipo para acceso offline y descarga la app de
          escritorio.
        </p>
        <div className="flex gap-2 flex-wrap">
          <Button asChild>
            <a href="/download" target="_blank" rel="noreferrer">
              Descargar app
            </a>
          </Button>
          <Button
            color="secondary"
            isLoading={registerDevice.isPending}
            onPress={async () => {
              if (!user) return;
              await registerDevice.mutateAsync({
                deviceId,
                name: "Este equipo",
                platform: navigator.platform,
              });
              await bindDeviceLocally({
                deviceId,
                clerkId: user.id,
                name: "Este equipo",
                platform: navigator.platform,
              });
            }}
          >
            Vincular este dispositivo
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
