"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc/client";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export const dynamic = "force-dynamic";

function dlCsv(rows: Array<Record<string, any>>, name: string) {
  if (!rows?.length) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.join(","),
    ...rows.map((r) =>
      headers.map((h) => JSON.stringify(r[h] ?? "")).join(",")
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name.endsWith(".csv") ? name : `${name}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function AnalysisEconomyPage() {
  const [period, setPeriod] = useState<{ from?: string; to?: string }>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("analysisPeriod:economy");
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    return {};
  });
  const [costOpenDay, setCostOpenDay] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem("economy:costOpenDay");
      if (raw) return Number(raw) || 0;
    }
    return 0;
  });
  const [fixedMonthlyCost, setFixedMonthlyCost] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const raw = localStorage.getItem("economy:fixedMonthlyCost");
      if (raw) return Number(raw) || 0;
    }
    return 0;
  });
  const router = useRouter();
  const fin = trpc.finance.kpis.useQuery({ from: period.from, to: period.to });
  const milk = trpc.milk.list.useQuery({ limit: 500 });
  const repro = trpc.breedingAdv.kpis.useQuery({
    from: period.from,
    to: period.to,
  });

  const animalsWithMilkCount = useMemo(() => {
    const rows = (milk.data || []).filter((r: any) => {
      const d = new Date(r.recordedAt);
      const f = period.from ? new Date(period.from) : null;
      const t = period.to ? new Date(period.to) : null;
      return (f ? d >= f : true) && (t ? d <= t : true);
    });
    return new Set(rows.map((r: any) => r.animalId).filter(Boolean)).size;
  }, [milk.data, period]);

  const openDaysCostEst = useMemo(() => {
    const avg = repro.data?.kpis?.avgDaysOpen || 0;
    return Math.round(
      avg * Math.max(0, costOpenDay) * Math.max(1, animalsWithMilkCount)
    );
  }, [repro.data, costOpenDay, animalsWithMilkCount]);

  const breakEvenNotes = useMemo(() => {
    const income = fin.data?.income || 0;
    const expense = fin.data?.expense || 0;
    const margin = fin.data?.margin || 0;
    // Estimación simple: si definimos costo fijo mensual, ventas necesarias = costo fijo + costos variables aprox. (usamos expense) -> punto de equilibrio si income >= fixed + expense
    const requiredIncome = fixedMonthlyCost + expense;
    const achieved = income >= requiredIncome;
    return { requiredIncome, achieved, margin };
  }, [fin.data, fixedMonthlyCost]);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Análisis · Economía</h1>
          <div className="flex items-center gap-2">
            <input
              aria-label="Desde"
              type="date"
              className="border rounded-md px-2 py-1 text-sm"
              value={period.from || ""}
              onChange={(e) => {
                const np = { ...period, from: e.target.value };
                setPeriod(np);
                try {
                  localStorage.setItem(
                    "analysisPeriod:economy",
                    JSON.stringify(np)
                  );
                } catch {}
              }}
            />
            <input
              aria-label="Hasta"
              type="date"
              className="border rounded-md px-2 py-1 text-sm"
              value={period.to || ""}
              onChange={(e) => {
                const np = { ...period, to: e.target.value };
                setPeriod(np);
                try {
                  localStorage.setItem(
                    "analysisPeriod:economy",
                    JSON.stringify(np)
                  );
                } catch {}
              }}
            />
            <Button
              size="sm"
              variant="flat"
              onPress={() => {
                fin.refetch();
                repro.refetch();
                milk.refetch();
              }}
            >
              Actualizar
            </Button>
            <Button
              size="sm"
              variant="solid"
              onPress={() => {
                router.push("/ai-assistant");
                setTimeout(() => {
                  window.dispatchEvent(
                    new CustomEvent("ai-seed-report", {
                      detail: {
                        module: "finance",
                        from: period.from || null,
                        to: period.to || null,
                      },
                    })
                  );
                }, 350);
              }}
            >
              Abrir en chat
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Card>
            <CardHeader>
              <CardTitle>Ingresos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">
                {(fin.data?.income || 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Egresos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">
                {(fin.data?.expense || 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Margen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">
                {(fin.data?.margin || 0).toLocaleString()}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Animales en leche (periodo)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">
                {animalsWithMilkCount}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card>
            <CardHeader>
              <CardTitle>Punto de equilibrio</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-neutral-600">
                Costo fijo mensual (COP)
              </div>
              <input
                aria-label="Costo fijo mensual"
                type="number"
                className="border rounded-md px-2 py-1 text-sm w-full"
                value={fixedMonthlyCost}
                onChange={(e) => {
                  const v = Number(e.target.value || 0);
                  setFixedMonthlyCost(v);
                  try {
                    localStorage.setItem("economy:fixedMonthlyCost", String(v));
                  } catch {}
                }}
              />
              <div className="text-sm">
                Ingresos requeridos ≈{" "}
                <b>{breakEvenNotes.requiredIncome.toLocaleString()}</b>
              </div>
              <div className="text-sm">
                Estado:{" "}
                <b
                  className={
                    breakEvenNotes.achieved ? "text-green-600" : "text-red-600"
                  }
                >
                  {breakEvenNotes.achieved
                    ? "En equilibrio o mejor"
                    : "Por debajo del equilibrio"}
                </b>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Costo estimado de días abiertos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-neutral-600">
                Costo por día abierto (COP)
              </div>
              <input
                aria-label="Costo por día abierto"
                type="number"
                className="border rounded-md px-2 py-1 text-sm w-full"
                value={costOpenDay}
                onChange={(e) => {
                  const v = Number(e.target.value || 0);
                  setCostOpenDay(v);
                  try {
                    localStorage.setItem("economy:costOpenDay", String(v));
                  } catch {}
                }}
              />
              <div className="text-sm">
                Días abiertos promedio:{" "}
                <b>{repro.data?.kpis?.avgDaysOpen || 0}</b>
              </div>
              <div className="text-sm">
                Animales considerados: <b>{animalsWithMilkCount}</b>
              </div>
              <div className="text-lg font-semibold">
                Costo estimado: {openDaysCostEst.toLocaleString()} COP
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Ingresos/Egresos por categoría</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="flat"
                  onPress={() =>
                    dlCsv(
                      (fin.data?.byCategory || []).map((r: any) => ({
                        categoria: r.label,
                        ingresos: r.income,
                        egresos: r.expense,
                        margen: r.margin,
                      })),
                      "economia_por_categoria.csv"
                    )
                  }
                >
                  CSV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-sm divide-y">
              {(fin.data?.byCategory || []).map((r: any) => (
                <div
                  key={r.label}
                  className="py-1 flex items-center justify-between"
                >
                  <div>{r.label}</div>
                  <div className="flex items-center gap-6">
                    <div>
                      Ingresos: <b>{r.income.toLocaleString()}</b>
                    </div>
                    <div>
                      Egresos: <b>{r.expense.toLocaleString()}</b>
                    </div>
                    <div>
                      Margen: <b>{r.margin.toLocaleString()}</b>
                    </div>
                  </div>
                </div>
              ))}
              {!(fin.data?.byCategory || []).length ? (
                <div className="text-neutral-500">Sin datos</div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
