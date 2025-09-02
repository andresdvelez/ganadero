"use client";

import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HeroModal } from "@/components/ui/hero-modal";
import { addToast } from "@/components/ui/toast";
import { useUser } from "@clerk/nextjs";

export default function HomeClientImpl() {
  return (
    // Eliminado TRPCProvider redundante: ya existe a nivel global en Providers
    <FarmsPanel />
  );
}

function FarmsPanel() {
  const { user } = useUser();
  const orgs = trpc.org.myOrganizations.useQuery(undefined, { enabled: true });
  const [open, setOpen] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);

  const firstOrgId = useMemo(() => orgs.data?.[0]?.id ?? null, [orgs.data]);

  const farms = trpc.farm.list.useQuery(
    { orgId: orgId || firstOrgId || "" },
    { enabled: Boolean(orgId || firstOrgId) }
  );

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Fincas</CardTitle>
        </CardHeader>
        <CardContent>
          {(!farms.data || farms.data.length === 0) && (
            <div className="flex items-center justify-between">
              <p className="text-neutral-600">
                No tienes fincas. Crea la primera para comenzar.
              </p>
              <Button color="primary" onPress={() => setOpen(true)}>
                Crear finca
              </Button>
            </div>
          )}
          {farms.data && farms.data.length > 0 && (
            <div className="space-y-2">
              <div className="flex justify-end">
                <Button color="primary" onPress={() => setOpen(true)}>
                  Nueva finca
                </Button>
              </div>
              <ul className="divide-y divide-neutral-200">
                {farms.data.map((f) => (
                  <li key={f.id} className="py-2">
                    <div className="font-medium">
                      {f.code} — {f.name}
                    </div>
                    <div className="text-sm text-neutral-600">
                      UGG total: {f.uggTotal ?? "—"} · Existencias M/H:{" "}
                      {f.maleCount}/{f.femaleCount}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateFarmModal
        open={open}
        onClose={() => setOpen(false)}
        defaultOrgId={firstOrgId || undefined}
      />
    </div>
  );
}

function CreateFarmModal({
  open,
  onClose,
  defaultOrgId,
}: {
  open: boolean;
  onClose: () => void;
  defaultOrgId?: string;
}) {
  const utils = trpc.useUtils();
  const create = trpc.farm.create.useMutation({
    onSuccess() {
      addToast({ variant: "success", title: "Finca creada" });
      utils.farm.list.invalidate();
      onClose();
    },
    onError(e) {
      addToast({
        variant: "error",
        title: "No se pudo crear",
        description: e.message,
      });
    },
  });

  const [form, setForm] = useState({
    orgId: defaultOrgId || "",
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

  return (
    <HeroModal open={open} onClose={onClose} title="Crear finca">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input
          label="Organización"
          placeholder="orgId"
          value={form.orgId}
          onChange={(e) =>
            setForm({ ...form, orgId: (e.target as HTMLInputElement).value })
          }
        />
        <Input
          label="Código"
          placeholder="LD-005"
          value={form.code}
          onChange={(e) =>
            setForm({ ...form, code: (e.target as HTMLInputElement).value })
          }
        />
        <Input
          label="Nombre"
          placeholder="GANADERÍA LAS BRISAS"
          value={form.name}
          onChange={(e) =>
            setForm({ ...form, name: (e.target as HTMLInputElement).value })
          }
        />
        <Input
          label="Localización"
          value={form.location}
          onChange={(e) =>
            setForm({ ...form, location: (e.target as HTMLInputElement).value })
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
            setForm({ ...form, address: (e.target as HTMLInputElement).value })
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
          label="Machos"
          type="number"
          value={form.maleCount as any}
          onChange={(e) =>
            setForm({
              ...form,
              maleCount: Number((e.target as HTMLInputElement).value) || 0,
            })
          }
        />
        <Input
          label="Hembras"
          type="number"
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
        <Button variant="bordered" onPress={onClose}>
          Cancelar
        </Button>
        <Button
          color="primary"
          isLoading={create.isPending}
          onPress={async () => {
            await create.mutateAsync({
              orgId: form.orgId,
              code: form.code,
              name: form.name,
              location: form.location || undefined,
              ownerName: form.ownerName || undefined,
              address: form.address || undefined,
              directions: form.directions || undefined,
              officialNumber: form.officialNumber || undefined,
              phone: form.phone || undefined,
              ranchPhone: form.ranchPhone || undefined,
              nit: form.nit || undefined,
              breederName: form.breederName || undefined,
              maleCount: form.maleCount,
              femaleCount: form.femaleCount,
            } as any);
          }}
        >
          Crear
        </Button>
      </div>
    </HeroModal>
  );
}
