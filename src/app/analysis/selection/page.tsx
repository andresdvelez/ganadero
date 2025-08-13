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

export default function AnalysisSelectionPage() {
  const [period, setPeriod] = useState<{ from?: string; to?: string }>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("analysisPeriod:selection");
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    return {};
  });
  const router = useRouter();
  const milk = trpc.milk.kpis.useQuery({
    from: period.from,
    to: period.to,
    top: 20,
  });
  const health = trpc.health.list.useQuery({ limit: 300 });

  const healthCostTop = useMemo(() => {
    const rows = (health.data || []).filter((r: any) => {
      const d = new Date(r.performedAt);
      const f = period.from ? new Date(period.from) : null;
      const t = period.to ? new Date(period.to) : null;
      return (f ? d >= f : true) && (t ? d <= t : true);
    });
    const map = new Map<string, { animalId: string; cost: number }>();
    rows.forEach((r: any) => {
      if (!r.animalId) return;
      const m = map.get(r.animalId) || { animalId: r.animalId, cost: 0 };
      m.cost += r.cost || 0;
      map.set(r.animalId, m);
    });
    return Array.from(map.values())
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 20);
  }, [health.data, period]);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Selección y Descarte</h1>
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
                    "analysisPeriod:selection",
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
                    "analysisPeriod:selection",
                    JSON.stringify(np)
                  );
                } catch {}
              }}
            />
            <Button
              size="sm"
              variant="flat"
              onPress={() => {
                milk.refetch();
                health.refetch();
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
                        module: "selection",
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

        <div className="grid grid-cols-1 md-grid-cols-2 gap-3 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Top productores (litros)</CardTitle>
                <Button
                  size="sm"
                  variant="flat"
                  onPress={() =>
                    dlCsv(
                      (milk.data?.topLiters || []).map((t: any) => ({
                        animal: `${t.animal?.name || "(sin nombre)"} #${
                          t.animal?.tagNumber || t.animalId
                        }`,
                        litros: t.liters,
                      })),
                      "seleccion_top_litros.csv"
                    )
                  }
                >
                  CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm divide-y">
                {(milk.data?.topLiters || []).map((t: any, i: number) => (
                  <div
                    key={t.animalId || i}
                    className="py-1 flex items-center justify-between"
                  >
                    <div>
                      {t.animal?.name || "(sin nombre)"} · #
                      {t.animal?.tagNumber || t.animalId}
                    </div>
                    <div className="font-medium">{t.liters} L</div>
                  </div>
                ))}
                {!(milk.data?.topLiters || []).length ? (
                  <div className="text-neutral-500">Sin datos</div>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Top costo salud (periodo)</CardTitle>
                <Button
                  size="sm"
                  variant="flat"
                  onPress={() =>
                    dlCsv(
                      healthCostTop.map((r) => ({
                        animalId: r.animalId,
                        costo: r.cost,
                      })),
                      "seleccion_top_costos_salud.csv"
                    )
                  }
                >
                  CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm divide-y">
                {healthCostTop.map((r, i) => (
                  <div
                    key={r.animalId || i}
                    className="py-1 flex items-center justify-between"
                  >
                    <div>#{r.animalId}</div>
                    <div className="font-medium">
                      {r.cost.toLocaleString()} COP
                    </div>
                  </div>
                ))}
                {!healthCostTop.length ? (
                  <div className="text-neutral-500">Sin datos</div>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
