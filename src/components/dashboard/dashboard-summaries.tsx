"use client";

import { trpc } from "@/lib/trpc/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMemo } from "react";

export function DashboardSummaries() {
  const orgs = trpc.org.myOrganizations.useQuery();
  const orgId = useMemo(() => orgs.data?.[0]?.id ?? "", [orgs.data]);

  const farms = trpc.farm.list.useQuery(
    { orgId },
    { enabled: !!orgId, refetchInterval: 60000 }
  );
  const alerts = trpc.alerts.listInstances.useQuery(
    { status: "open", limit: 5 },
    { refetchInterval: 30000 }
  );
  const animals = trpc.animal.getAll.useQuery(undefined, {
    refetchInterval: 60000,
  });

  // Litros del mes (inicio mes -> ahora)
  const now = new Date();
  const fromMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const milkKpis = trpc.milk.kpis.useQuery(
    { from: fromMonth.toISOString(), to: now.toISOString(), top: 5 },
    { refetchInterval: 60000 }
  );

  // Partos del mes: contamos breedingRecord tipo birth en rango
  const birthsThisMonth = trpc.breedingAdv.actionLists.useQuery(
    { refDate: now.toISOString() },
    { refetchInterval: 60000 }
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

  // KPI animales activos
  const activeAnimals = (animals.data || []).filter(
    (a: any) => a.status !== "sold" && a.status !== "deceased"
  ).length;

  // KPI litros del mes: sumamos topLiters si viene acotado al mes; si no, sumamos rows filtrados (kpis devuelve top)
  const litersMonth = (milkKpis.data?.topLiters || []).reduce(
    (s: number, r: any) => s + (r.liters || 0),
    0
  );

  // KPI partos del mes (aproximación): contamos expectedDueDate o event type birth del mes en actionLists
  let birthsCount = 0;
  if (birthsThisMonth.data) {
    const ref = fromMonth.getTime();
    const end = now.getTime();
    // actionLists no trae todos los campos; este aproximado requiere mejoras en backend.
    // Dejamos 0 si no hay datos suficientes.
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
        <div className="text-2xl font-semibold">
          {alerts.data?.items?.length || 0}
        </div>
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
          Hato total en plataforma
        </div>
      </Card>
      <Card className="p-4">
        <div className="text-xs text-neutral-500">Litros del mes</div>
        <div className="text-2xl font-semibold">
          {Number(litersMonth || 0).toFixed(1)}
        </div>
        <div className="text-xs text-neutral-500 mt-1">
          Desde {fromMonth.toLocaleDateString()}
        </div>
      </Card>
      <Card className="p-4">
        <div className="text-xs text-neutral-500">Partos del mes</div>
        <div className="text-2xl font-semibold">{birthsCount}</div>
        <div className="text-xs text-neutral-500 mt-1">
          Próx. versión: conteo exacto
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
