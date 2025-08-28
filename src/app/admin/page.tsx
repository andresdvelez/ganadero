"use client";

import { useEffect, useMemo, useState } from "react";
import { TRPCProvider } from "@/lib/trpc/provider";
import { trpc } from "@/lib/trpc/client";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { addToast } from "@/components/ui/toast";
import { HeroModal } from "@/components/ui/hero-modal";
import Link from "next/link";

function exportCSV(rows: any[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((r) =>
      headers.map((h) => JSON.stringify(r[h] ?? "")).join(",")
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

export default function AdminPage() {
  return (
    // Quitar TRPCProvider duplicado: el provider global ya envuelve la app
    <DashboardLayout>
      <AdminImpl />
    </DashboardLayout>
  );
}

function AdminImpl() {
  const orgs = trpc.org.myOrganizations.useQuery();
  const orgId = useMemo(() => orgs.data?.[0]?.id ?? "", [orgs.data]);
  const myRole = useMemo(() => orgs.data?.[0]?.role ?? null, [orgs.data]);
  const farmsQ = trpc.farm.list.useQuery(
    { orgId },
    { enabled: !!orgId, refetchInterval: 60000 }
  );

  const isLoadingOrg = orgs.isLoading;
  const isNotAdmin = myRole !== "ADMIN";

  const [activeFarmId, setActiveFarmId] = useState<string | null>(null);
  const [period, setPeriod] = useState<{ from: string; to: string }>(() => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: from.toISOString(), to: now.toISOString() };
  });

  useEffect(() => {
    try {
      const s = window.localStorage.getItem("ACTIVE_FARM_ID");
      if (s) setActiveFarmId(s);
    } catch {}
  }, []);

  useEffect(() => {
    try {
      if (activeFarmId)
        window.localStorage.setItem("ACTIVE_FARM_ID", activeFarmId);
    } catch {}
  }, [activeFarmId]);

  const farms = farmsQ.data || [];

  const totalUGG = farms.reduce(
    (s: number, f: any) => s + (f.uggTotal || 0),
    0
  );
  const totalM = farms.reduce((s: number, f: any) => s + (f.maleCount || 0), 0);
  const totalH = farms.reduce(
    (s: number, f: any) => s + (f.femaleCount || 0),
    0
  );

  const calcUGG = trpc.farm.calcUGG.useMutation({
    onSuccess() {
      addToast({ variant: "success", title: "UGG actualizada" });
      farmsQ.refetch();
    },
    onError(e) {
      addToast({
        variant: "error",
        title: "No se pudo calcular UGG",
        description: e.message,
      });
    },
  });

  // Modal crear/editar
  const createFarm = trpc.farm.create.useMutation({
    onSuccess() {
      addToast({ variant: "success", title: "Finca creada" });
      farmsQ.refetch();
      setOpen(false);
    },
    onError(e) {
      const msg = e.message || "";
      let description = msg;
      if (
        /does not exist/i.test(msg) ||
        /relation .* does not exist/i.test(msg)
      ) {
        description =
          "Faltan migraciones en la base de datos. Aplica 'prisma migrate deploy' o 'prisma db push' y reintenta.";
      } else if (/Unique constraint|P2002/i.test(msg)) {
        description = "El código de finca ya está en uso en esta organización.";
      }
      addToast({
        variant: "error",
        title: "No se pudo crear",
        description,
      });
    },
  });
  const updateFarm = trpc.farm.update.useMutation({
    onSuccess() {
      addToast({ variant: "success", title: "Finca actualizada" });
      farmsQ.refetch();
      setOpen(false);
    },
    onError(e) {
      addToast({
        variant: "error",
        title: "No se pudo actualizar",
        description: e.message,
      });
    },
  });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>({
    orgId,
    code: "",
    name: "",
    location: "",
    ownerName: "",
    address: "",
    directions: "",
    officialNumber: "",
    phone: "",
    ranchPhone: "",
    nit: "",
    breederName: "",
    maleCount: 0,
    femaleCount: 0,
  });
  function openCreate() {
    setEditing(null);
    setForm({
      orgId,
      code: "",
      name: "",
      location: "",
      ownerName: "",
      address: "",
      directions: "",
      officialNumber: "",
      phone: "",
      ranchPhone: "",
      nit: "",
      breederName: "",
      maleCount: 0,
      femaleCount: 0,
    });
    setOpen(true);
  }
  function openEdit(f: any) {
    setEditing(f);
    setForm({
      orgId,
      code: f.code || "",
      name: f.name || "",
      location: f.location || "",
      ownerName: f.ownerName || "",
      address: f.address || "",
      directions: f.directions || "",
      officialNumber: f.officialNumber || "",
      phone: f.phone || "",
      ranchPhone: f.ranchPhone || "",
      nit: f.nit || "",
      breederName: f.breederName || "",
      maleCount: f.maleCount || 0,
      femaleCount: f.femaleCount || 0,
    });
    setOpen(true);
  }

  async function onSave() {
    if (!form.code || !form.name) {
      addToast({ variant: "warning", title: "Completa código y nombre" });
      return;
    }
    if (editing) {
      await updateFarm.mutateAsync({ id: editing.id, ...form });
    } else {
      await createFarm.mutateAsync(form);
    }
  }

  if (isLoadingOrg) return null;
  if (isNotAdmin) {
    return (
      <div className="p-6">
        <Card className="p-4">
          <div className="text-sm text-neutral-700">
            Solo administradores pueden gestionar fincas.
          </div>
          <div className="mt-3">
            <Button asChild>
              <Link href="/">Volver al inicio</Link>
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <div className="text-sm text-neutral-600">Periodo</div>
          <div className="flex gap-2">
            <Input
              type="date"
              value={period.from.slice(0, 10)}
              onChange={(e: any) =>
                setPeriod((p) => ({
                  ...p,
                  from: (e.target as HTMLInputElement).value + "T00:00:00.000Z",
                }))
              }
            />
            <Input
              type="date"
              value={period.to.slice(0, 10)}
              onChange={(e: any) =>
                setPeriod((p) => ({
                  ...p,
                  to: (e.target as HTMLInputElement).value + "T23:59:59.999Z",
                }))
              }
            />
          </div>
        </div>
        <div>
          <div className="text-sm text-neutral-600">Finca activa</div>
          <select
            aria-label="Seleccionar finca activa"
            className="px-3 py-2 border border-neutral-300 rounded-lg"
            value={activeFarmId || ""}
            onChange={(e) =>
              setActiveFarmId((e.target as HTMLSelectElement).value || null)
            }
          >
            <option value="">— Todas —</option>
            {farms.map((f: any) => (
              <option key={f.id} value={f.id}>
                {f.code} — {f.name}
              </option>
            ))}
          </select>
        </div>
        <div className="ml-auto flex gap-2">
          <Button
            onPress={() =>
              exportCSV(
                farms.map((f: any) => ({
                  id: f.id,
                  code: f.code,
                  name: f.name,
                  ugg: f.uggTotal ?? "",
                  male: f.maleCount,
                  female: f.femaleCount,
                })),
                `fincas_${new Date().toISOString().slice(0, 10)}.csv`
              )
            }
          >
            Exportar CSV
          </Button>
          <Button color="primary" onPress={openCreate}>
            Crear finca
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="text-xs text-neutral-500">UGG total</div>
          <div className="text-2xl font-semibold">
            {Number(totalUGG || 0).toFixed(2)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-neutral-500">Existencias</div>
          <div className="text-2xl font-semibold">{totalM + totalH}</div>
          <div className="text-xs text-neutral-500 mt-1">
            M:{totalM} · H:{totalH}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-neutral-500">Fincas</div>
          <div className="text-2xl font-semibold">{farms.length}</div>
        </Card>
      </div>

      {/* Tabla de fincas */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-neutral-100 text-left text-sm">
                <th className="px-4 py-2">Código</th>
                <th className="px-4 py-2">Nombre</th>
                <th className="px-4 py-2">UGG</th>
                <th className="px-4 py-2">M/H</th>
                <th className="px-4 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {farms
                .filter((f: any) => !activeFarmId || f.id === activeFarmId)
                .map((f: any) => (
                  <tr key={f.id} className="border-t text-sm">
                    <td className="px-4 py-2 whitespace-nowrap font-medium">
                      {f.code}
                    </td>
                    <td className="px-4 py-2">{f.name}</td>
                    <td className="px-4 py-2">{f.uggTotal ?? "—"}</td>
                    <td className="px-4 py-2">
                      {f.maleCount}/{f.femaleCount}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="bordered"
                          onPress={() => {
                            setActiveFarmId(f.id);
                            addToast({
                              variant: "info",
                              title: "Finca activa",
                              description: `${f.code} — ${f.name}`,
                            });
                          }}
                        >
                          Seleccionar
                        </Button>
                        <Button
                          size="sm"
                          variant="flat"
                          onPress={() => openEdit(f)}
                        >
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          onPress={() =>
                            calcUGG.mutate({
                              id: f.id,
                              weightMale: 1,
                              weightFemale: 1,
                            })
                          }
                        >
                          Calcular UGG
                        </Button>
                        <Button size="sm" variant="flat" asChild>
                          <Link href="/analysis">Ir a análisis</Link>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Crear/Editar */}
      <HeroModal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Editar finca" : "Crear finca"}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Input
            label="Código"
            placeholder="Ej: F001"
            description="Identificador corto y único dentro de la organización"
            value={form.code}
            onChange={(e) =>
              setForm({ ...form, code: (e.target as HTMLInputElement).value })
            }
          />
          <Input
            label="Nombre"
            placeholder="Ej: Hacienda La Esmeralda"
            value={form.name}
            onChange={(e) =>
              setForm({ ...form, name: (e.target as HTMLInputElement).value })
            }
          />
          <Input
            label="Localización"
            value={form.location}
            onChange={(e) =>
              setForm({
                ...form,
                location: (e.target as HTMLInputElement).value,
              })
            }
          />
          <Input
            label="Propietario"
            value={form.ownerName}
            onChange={(e) =>
              setForm({
                ...form,
                ownerName: (e.target as HTMLInputElement).value,
              })
            }
          />
          <Input
            label="Dirección"
            value={form.address}
            onChange={(e) =>
              setForm({
                ...form,
                address: (e.target as HTMLInputElement).value,
              })
            }
          />
          <Input
            label="Cómo llegar"
            value={form.directions}
            onChange={(e) =>
              setForm({
                ...form,
                directions: (e.target as HTMLInputElement).value,
              })
            }
          />
          <Input
            label="Número oficial"
            value={form.officialNumber}
            onChange={(e) =>
              setForm({
                ...form,
                officialNumber: (e.target as HTMLInputElement).value,
              })
            }
          />
          <Input
            label="Teléfono"
            value={form.phone}
            onChange={(e) =>
              setForm({ ...form, phone: (e.target as HTMLInputElement).value })
            }
          />
          <Input
            label="Teléfono Hda"
            value={form.ranchPhone}
            onChange={(e) =>
              setForm({
                ...form,
                ranchPhone: (e.target as HTMLInputElement).value,
              })
            }
          />
          <Input
            label="NIT"
            value={form.nit}
            onChange={(e) =>
              setForm({ ...form, nit: (e.target as HTMLInputElement).value })
            }
          />
          <Input
            label="Criador"
            value={form.breederName}
            onChange={(e) =>
              setForm({
                ...form,
                breederName: (e.target as HTMLInputElement).value,
              })
            }
          />
          <Input
            type="number"
            label="Machos"
            value={form.maleCount as any}
            onChange={(e) =>
              setForm({
                ...form,
                maleCount: Number((e.target as HTMLInputElement).value) || 0,
              })
            }
          />
          <Input
            type="number"
            label="Hembras"
            value={form.femaleCount as any}
            onChange={(e) =>
              setForm({
                ...form,
                femaleCount: Number((e.target as HTMLInputElement).value) || 0,
              })
            }
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="bordered" onPress={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button
            color="primary"
            isLoading={createFarm.isPending || updateFarm.isPending}
            onPress={onSave}
          >
            Guardar
          </Button>
        </div>
      </HeroModal>
    </div>
  );
}
