"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { trpc } from "@/lib/trpc/client";
import { useMemo } from "react";

export default function Page() {
  const orgs = trpc.org.myOrganizations.useQuery();
  const orgId = useMemo(() => orgs.data?.[0]?.id ?? "", [orgs.data]);
  const finance = trpc.finance.kpis.useQuery({}, { enabled: true });
  const health = trpc.health.kpis.useQuery({}, { enabled: true });
  const breeding = trpc.breedingAdv.kpis.useQuery({}, { enabled: true });
  const inventory = trpc.inventory.kpis.useQuery({}, { enabled: true });

  return (
    <DashboardLayout>
      <div className="p-4 space-y-6">
        <h1 className="text-2xl font-semibold">Analíticas de la finca</h1>
        <div className="grid gap-4 md:grid-cols-2">
          <KpiCard title="Economía" loading={finance.isLoading}>
            <MiniStat label="Ingresos" value={finance.data?.income || 0} prefix="$" />
            <MiniStat label="Egresos" value={finance.data?.expense || 0} prefix="$" />
            <MiniStat label="Margen" value={(finance.data?.income || 0) - (finance.data?.expense || 0)} prefix="$" />
          </KpiCard>
          <KpiCard title="Salud" loading={health.isLoading}>
            <MiniStat label="Registros" value={health.data?.series?.length || 0} />
          </KpiCard>
          <KpiCard title="Reproducción" loading={breeding.isLoading}>
            <MiniStat label="Tasa preñez (%)" value={breeding.data?.pregnancyRatePct || 0} />
            <MiniStat label="IEP (días)" value={breeding.data?.calvingIntervalDays || 0} />
          </KpiCard>
          <KpiCard title="Inventario" loading={inventory.isLoading}>
            <MiniStat label="Productos críticos" value={inventory.data?.lowStock?.length || 0} />
          </KpiCard>
        </div>
      </div>
    </DashboardLayout>
  );
}

function KpiCard({ title, loading, children }: { title: string; loading?: boolean; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="font-medium mb-2">{title}</div>
      {loading ? <div className="text-sm text-neutral-500">Cargando…</div> : <div className="grid sm:grid-cols-2 gap-3">{children}</div>}
    </div>
  );
}

function MiniStat({ label, value, prefix = "" }: { label: string; value: number; prefix?: string }) {
  const pretty = new Intl.NumberFormat("es-CO").format(Math.round(value));
  return (
    <div className="rounded-lg border p-3 bg-neutral-50">
      <div className="text-xs text-neutral-600">{label}</div>
      <div className="text-lg font-semibold">{prefix}{pretty}</div>
    </div>
  );
}
