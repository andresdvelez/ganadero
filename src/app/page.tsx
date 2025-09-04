"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { trpc } from "@/lib/trpc/client";
import { useMemo, Suspense } from "react";
import dynamic from "next/dynamic";

export default function Page() {
  const orgs = trpc.org.myOrganizations.useQuery();
  const orgId = useMemo(() => orgs.data?.[0]?.id ?? "", [orgs.data]);
  const finance = trpc.finance.kpis.useQuery({}, { enabled: true });
  const health = trpc.health.kpis.useQuery({}, { enabled: true });
  const breeding = trpc.breedingAdv.kpis.useQuery({}, { enabled: true });
  const inventory = trpc.inventory.kpis.useQuery({}, { enabled: true });
  const milkList = trpc.milk.list.useQuery({ limit: 50 }, { enabled: true });
  const weightsQ = trpc.weights.listWeights.useQuery({ limit: 200 }, { enabled: true });

  const RevenueChart = dynamic(() => import("@/components/embedded/_charts/revenue-chart"), { ssr: false, loading: () => <div className="text-sm text-neutral-500">Cargando gráfico…</div> });
  const IncomeExpenseLines = dynamic(() => import("@/components/embedded/_charts/income-expense-lines"), { ssr: false, loading: () => <div className="text-sm text-neutral-500">Cargando gráfico…</div> });
  const CategoryBars = dynamic(() => import("@/components/embedded/_charts/category-bars"), { ssr: false, loading: () => <div className="text-sm text-neutral-500">Cargando gráfico…</div> });
  const InventoryPie = dynamic(() => import("@/components/embedded/_charts/inventory-pie"), { ssr: false, loading: () => <div className="text-sm text-neutral-500">Cargando gráfico…</div> });
  const HealthTrendChart = dynamic(() => import("@/components/embedded/_charts/health-trend-chart"), { ssr: false, loading: () => <div className="text-sm text-neutral-500">Cargando gráfico…</div> });
  const MilkChart = dynamic(() => import("@/components/embedded/_charts/milk-chart"), { ssr: false, loading: () => <div className="text-sm text-neutral-500">Cargando gráfico…</div> });
  const ReproductionTrends = dynamic(() => import("@/components/embedded/_charts/reproduction-trends"), { ssr: false, loading: () => <div className="text-sm text-neutral-500">Cargando gráfico…</div> });
  const GeneticsGrowth = dynamic(() => import("@/components/embedded/_charts/genetics-growth"), { ssr: false, loading: () => <div className="text-sm text-neutral-500">Cargando gráfico…</div> });
  const PastureOccupancy = dynamic(() => import("@/components/embedded/_charts/pasture-occupancy"), { ssr: false, loading: () => <div className="text-sm text-neutral-500">Cargando gráfico…</div> });

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
          <div className="rounded-xl border bg-white p-4">
            <div className="font-medium mb-2">Comportamiento de ingresos</div>
            <Suspense>
              <RevenueChart
                data={(finance.data?.monthly || []).map((m: any) => ({
                  date: m.period,
                  income: m.income,
                  expense: m.expense,
                }))}
              />
            </Suspense>
          </div>
          <KpiCard title="Salud" loading={health.isLoading}>
            <MiniStat label="Registros" value={health.data?.series?.length || 0} />
          </KpiCard>
          <div className="rounded-xl border bg-white p-4">
            <div className="font-medium mb-2">Tendencias de salud</div>
            <Suspense>
              <HealthTrendChart
                data={(health.data?.series || []).map((r: any) => ({
                  date: r.date ?? r.period ?? "",
                  cases: r.cases ?? r.count ?? r.cost ?? 0,
                  recoveries: r.recoveries ?? r.recovered ?? 0,
                }))}
              />
            </Suspense>
          </div>
          <KpiCard title="Reproducción" loading={breeding.isLoading}>
            <MiniStat label="Tasa preñez (%)" value={breeding.data?.kpis?.pregnancyRate ?? 0} />
            <MiniStat label="IEP (días)" value={breeding.data?.kpis?.avgCalvingInterval ?? 0} />
          </KpiCard>
          <div className="rounded-xl border bg-white p-4">
            <div className="font-medium mb-2">Tendencias de reproducción</div>
            <Suspense>
              <ReproductionTrends
                data={(breeding.data?.trend || []).map((t: any) => ({
                  date: t.period,
                  pregnancyRate: t.value ?? 0,
                  calvingIntervalDays: 0,
                }))}
              />
            </Suspense>
          </div>
          <KpiCard title="Inventario" loading={inventory.isLoading}>
            <MiniStat label="Productos críticos" value={inventory.data?.lowStock?.length || 0} />
          </KpiCard>
          <div className="rounded-xl border bg-white p-4">
            <div className="font-medium mb-2">Ingresos vs Egresos</div>
            <Suspense>
              <IncomeExpenseLines
                data={(finance.data?.monthly || []).map((m: any) => ({ date: m.period, income: m.income, expense: m.expense }))}
              />
            </Suspense>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <div className="font-medium mb-2">Por categoría</div>
            <Suspense>
              <CategoryBars data={finance.data?.byCategory || []} />
            </Suspense>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <div className="font-medium mb-2">Costos por categoría</div>
            <Suspense>
              <InventoryPie
                data={(inventory.data?.costByCategory || []).map((r: any) => ({ name: r.label, value: r.value }))}
              />
            </Suspense>
          </div>
          <div className="rounded-xl border bg-white p-4 md:col-span-2">
            <div className="font-medium mb-2">Producción lechera</div>
            <Suspense>
              <MilkChart
                data={(milkList.data || []).map((r: any) => ({
                  date: r.recordedAt ? new Date(r.recordedAt).toISOString().slice(0, 10) : "",
                  liters: r.liters || 0,
                }))}
              />
            </Suspense>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <div className="font-medium mb-2">Genética y crecimiento</div>
            <Suspense>
              <GeneticsGrowth
                data={(weightsQ.data || []).map((r: any) => ({
                  date: r.weighedAt ? new Date(r.weighedAt).toISOString().slice(0, 10) : "",
                  adg: r.weightKg ?? 0,
                  epdIndex: 0,
                }))}
              />
            </Suspense>
          </div>
          <div className="rounded-xl border bg-white p-4">
            <div className="font-medium mb-2">Ocupación de potreros</div>
            <Suspense>
              <PastureOccupancy data={(inventory.data?.pastureOccupancy || []).map((p: any) => ({ pasture: p.name, occupancy: p.occupancy }))} />
            </Suspense>
          </div>
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
