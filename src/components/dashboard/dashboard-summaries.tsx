"use client";

import { trpc } from "@/lib/trpc/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEffect, useMemo, useState } from "react";

export function DashboardSummaries() {
  const orgs = trpc.org.myOrganizations.useQuery();
  const orgId = useMemo(() => orgs.data?.[0]?.id ?? "", [orgs.data]);

  // Leer ACTIVE_FARM_ID local para decidir si habilitar KPIs
  const [activeFarmId, setActiveFarmId] = useState<string | null>(null);
  useEffect(() => {
    try {
      const s = window.localStorage.getItem("ACTIVE_FARM_ID");
      setActiveFarmId(s || null);
    } catch {
      setActiveFarmId(null);
    }
  }, []);

  const farms = trpc.farm.list.useQuery(
    { orgId },
    {
      enabled: !!orgId,
      refetchInterval: 60000,
      retry: false,
      refetchOnWindowFocus: false,
    }
  );
  const alerts = trpc.alerts.listInstances.useQuery(
    { status: "open", limit: 5 },
    {
      refetchInterval: 30000,
      enabled: !!orgId,
      retry: false,
      refetchOnWindowFocus: false,
    }
  );

  const animals = trpc.animal.getAll.useQuery(undefined, {
    refetchInterval: 60000,
    enabled: !!activeFarmId, // requiere farmId en header
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Estabilizar rango del mes actual para evitar cambiar en cada render
  const [range, setRange] = useState<{ fromIso: string; toIso: string }>(() => {
    const now = new Date();
    const fromMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return { fromIso: fromMonth.toISOString(), toIso: now.toISOString() };
  });
  // Opcional: refrescar cada minuto para mantener "to" razonablemente actualizado
  useEffect(() => {
    const t = setInterval(() => {
      const now = new Date();
      setRange((prev) => ({ ...prev, toIso: now.toISOString() }));
    }, 60000);
    return () => clearInterval(t);
  }, []);

  const milkKpis = trpc.milk.kpis.useQuery(
    { from: range.fromIso, to: range.toIso, top: 5 },
    {
      refetchInterval: 60000,
      enabled: !!activeFarmId,
      retry: false,
      refetchOnWindowFocus: false,
    }
  );

  const birthsThisMonth = trpc.breedingAdv.actionLists.useQuery(
    { refDate: range.toIso },
    {
      refetchInterval: 60000,
      enabled: !!activeFarmId,
      retry: false,
      refetchOnWindowFocus: false,
    }
  );

  if (!orgId) return null;

  const totalUGG = (farms.data || []).reduce(
    (acc: number, f: any) => acc + (f.uggTotal || 0),
    0
  );
  const totalMales = (farms.data || []).reduce(
    (acc: number, f: any) => acc + (f.maleCount || 0),
    0
  );
  const totalFemales = (farms.data || []).reduce(
    (acc: number, f: any) => acc + (f.femaleCount || 0),
    0
  );

  const activeAnimals = (animals.data || []).filter(
    (a: any) => a.status !== "sold" && a.status !== "deceased"
  ).length;

  const litersMonth = (milkKpis.data?.topLiters || []).reduce(
    (s: number, r: any) => s + (r.liters || 0),
    0
  );

  let birthsCount = 0;
  if (birthsThisMonth.data) {
    birthsCount = 0;
  }

  return (
    <div className="max-w-4xl mx-auto mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
      <Card className="p-4">
        <div className="text-xs text-neutral-500">UGG total</div>
        <div className="text-2xl font-semibold">
          {Number(totalUGG || 0).toFixed(2)}
        </div>
        <div className="text-xs text-neutral-500 mt-1">
          {farms.data?.length || 0} fincas · actualiza en tiempo real
        </div>
      </Card>
      <Card className="p-4">
        <div className="text-xs text-neutral-500">Existencias</div>
        <div className="text-2xl font-semibold">
          {totalMales + totalFemales}
        </div>
        <div className="text-xs text-neutral-500 mt-1">
          M:{totalMales} · H:{totalFemales}
        </div>
      </Card>
      <Card className="p-4">
        <div className="text-xs text-neutral-500">Alertas abiertas</div>
        <div className="text-2xl font-semibold">{alerts.data?.length || 0}</div>
        <div className="mt-2 flex gap-2">
          <Button asChild size="sm" variant="flat">
            <a href="/alerts">Ver alertas</a>
          </Button>
          <Button asChild size="sm" variant="flat">
            <a href="/_/settings/sync">Evaluar</a>
          </Button>
        </div>
      </Card>

      <Card className="p-4">
        <div className="text-xs text-neutral-500">Animales activos</div>
        <div className="text-2xl font-semibold">{activeAnimals}</div>
        <div className="text-xs text-neutral-500 mt-1">
          Requiere finca activa
        </div>
      </Card>
      <Card className="p-4">
        <div className="text-xs text-neutral-500">Litros del mes</div>
        <div className="text-2xl font-semibold">
          {Number(litersMonth || 0).toFixed(1)}
        </div>
        <div className="text-xs text-neutral-500 mt-1">
          Desde {new Date(range.fromIso).toLocaleDateString()}
        </div>
      </Card>
      <Card className="p-4">
        <div className="text-xs text-neutral-500">Partos del mes</div>
        <div className="text-2xl font-semibold">{birthsCount}</div>
        <div className="text-xs text-neutral-500 mt-1">
          Requiere finca activa
        </div>
      </Card>

      {farms.data && farms.data.length > 0 && (
        <div className="sm:col-span-3">
          <Card className="p-3">
            <div className="text-sm font-medium mb-2">Fincas</div>
            <ul className="divide-y divide-neutral-200">
              {farms.data.slice(0, 6).map((f: any) => (
                <li
                  key={f.id}
                  className="py-2 flex items-center justify-between"
                >
                  <div>
                    <div className="font-medium text-sm">
                      {f.code} — {f.name}
                    </div>
                    <div className="text-xs text-neutral-500">
                      UGG: {f.uggTotal ?? "—"} · M/H: {f.maleCount}/
                      {f.femaleCount}
                    </div>
                  </div>
                  <Button asChild size="sm" variant="bordered">
                    <a href={`/pastures`}>Abrir</a>
                  </Button>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}
