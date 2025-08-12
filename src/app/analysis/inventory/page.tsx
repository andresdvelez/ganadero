"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc/client";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export const dynamic = "force-dynamic";

function dlCsv(rows: any[], name: string) {
  if (!rows?.length) return;
  const h = Object.keys(rows[0]);
  const csv = [
    h.join(","),
    ...rows.map((r) => h.map((k) => JSON.stringify(r[k] ?? "")).join(",")),
  ].join("\n");
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" })
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
function dlSvg(node: SVGSVGElement | null, name: string) {
  if (!node) return;
  const s = new XMLSerializer().serializeToString(node);
  const url = URL.createObjectURL(
    new Blob([s], { type: "image/svg+xml;charset=utf-8" })
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
function dlPng(node: SVGSVGElement | null, name: string) {
  if (!node) return;
  const s = new XMLSerializer().serializeToString(node);
  const img = new Image();
  const url = URL.createObjectURL(
    new Blob([s], { type: "image/svg+xml;charset=utf-8" })
  );
  img.onload = () => {
    const w = Number(node.getAttribute("width") || 600);
    const h = Number(node.getAttribute("height") || 300);
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0);
    c.toBlob((b) => {
      if (!b) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(b);
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }, "image/png");
  };
  img.src = url;
}

export default function AnalysisInventoryPage() {
  const [period, setPeriod] = useState<{ from?: string; to?: string }>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("analysisPeriod:inventory");
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    return {};
  });
  const router = useRouter();
  const k = trpc.inventory.kpis.useQuery({
    from: period.from,
    to: period.to,
    topLow: 10,
  });
  const moves = trpc.inventory.listMovements.useQuery({ limit: 500 });
  const barCatRef = useRef<SVGSVGElement | null>(null);

  const rotation = useMemo(() => {
    const map = new Map<string, { in: number; out: number }>();
    (moves.data || []).forEach((m: any) => {
      const e = map.get(m.productId) || { in: 0, out: 0 };
      if (m.type === "in") e.in += m.quantity;
      else if (m.type === "out") e.out += m.quantity;
      map.set(m.productId, e);
    });
    return Array.from(map.entries()).map(([productId, v]) => ({
      productId,
      turnover: v.out,
    }));
  }, [moves.data]);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Análisis · Inventario</h1>
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
                    "analysisPeriod:inventory",
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
                    "analysisPeriod:inventory",
                    JSON.stringify(np)
                  );
                } catch {}
              }}
            />
            <Button size="sm" variant="flat" onPress={() => k.refetch()}>
              Actualizar
            </Button>
            <div className="hidden md:flex items-center gap-1">
              <Button
                size="sm"
                variant="flat"
                onPress={() => {
                  const now = new Date();
                  const d = new Date(
                    now.getFullYear(),
                    now.getMonth(),
                    now.getDate()
                  );
                  const np = {
                    from: d.toISOString().slice(0, 10),
                    to: d.toISOString().slice(0, 10),
                  };
                  setPeriod(np);
                  try {
                    localStorage.setItem(
                      "analysisPeriod:inventory",
                      JSON.stringify(np)
                    );
                  } catch {}
                }}
              >
                Hoy
              </Button>
              <Button
                size="sm"
                variant="flat"
                onPress={() => {
                  const now = new Date();
                  const from = new Date(now.getTime() - 7 * 86400000);
                  const np = {
                    from: from.toISOString().slice(0, 10),
                    to: new Date().toISOString().slice(0, 10),
                  };
                  setPeriod(np);
                  try {
                    localStorage.setItem(
                      "analysisPeriod:inventory",
                      JSON.stringify(np)
                    );
                  } catch {}
                }}
              >
                7 días
              </Button>
              <Button
                size="sm"
                variant="flat"
                onPress={() => {
                  const now = new Date();
                  const from = new Date(now.getTime() - 30 * 86400000);
                  const np = {
                    from: from.toISOString().slice(0, 10),
                    to: new Date().toISOString().slice(0, 10),
                  };
                  setPeriod(np);
                  try {
                    localStorage.setItem(
                      "analysisPeriod:inventory",
                      JSON.stringify(np)
                    );
                  } catch {}
                }}
              >
                30 días
              </Button>
              <Button
                size="sm"
                variant="flat"
                onPress={() => {
                  const now = new Date();
                  const from = new Date(now.getFullYear(), now.getMonth(), 1);
                  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                  const np = {
                    from: from.toISOString().slice(0, 10),
                    to: to.toISOString().slice(0, 10),
                  };
                  setPeriod(np);
                  try {
                    localStorage.setItem(
                      "analysisPeriod:inventory",
                      JSON.stringify(np)
                    );
                  } catch {}
                }}
              >
                Este mes
              </Button>
            </div>
            <Button
              size="sm"
              variant="solid"
              onPress={() => {
                router.push("/ai-assistant");
                setTimeout(() => {
                  window.dispatchEvent(
                    new CustomEvent("ai-seed-report", {
                      detail: {
                        module: "inventory",
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

        <Card>
          <CardHeader>
            <CardTitle>Costo por categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-end gap-2 mb-2">
              <Button
                size="sm"
                variant="flat"
                onPress={() =>
                  dlCsv(
                    k.data?.costByCategory || [],
                    "inv_costo_por_categoria.csv"
                  )
                }
              >
                CSV
              </Button>
              <Button
                size="sm"
                variant="flat"
                onPress={() =>
                  dlSvg(barCatRef.current, "inv_costo_por_categoria.svg")
                }
              >
                SVG
              </Button>
              <Button
                size="sm"
                variant="flat"
                onPress={() =>
                  dlPng(barCatRef.current, "inv_costo_por_categoria.png")
                }
              >
                PNG
              </Button>
            </div>
            <svg ref={barCatRef} width={800} height={280} role="img">
              <g transform={`translate(${32}, ${24})`}>
                {(() => {
                  const rows = k.data?.costByCategory || [];
                  const w = 800 - 64;
                  const h = 280 - 56;
                  const max = Math.max(1, ...rows.map((d: any) => d.value));
                  const bw = w / Math.max(1, rows.length);
                  return (
                    <>
                      <line x1={0} y1={h} x2={w} y2={h} stroke="#ddd" />
                      {rows.map((d: any, i: number) => {
                        const bh = (d.value / max) * (h - 12);
                        const x = i * bw + 6;
                        const y = h - bh;
                        return (
                          <g key={i}>
                            <rect
                              x={x}
                              y={y}
                              width={bw - 12}
                              height={bh}
                              fill="#0EA5E9"
                              opacity={0.9}
                              rx={4}
                            />
                            <text
                              x={x + (bw - 12) / 2}
                              y={h + 12}
                              fontSize={11}
                              textAnchor="middle"
                              fill="#444"
                            >
                              {d.label}
                            </text>
                          </g>
                        );
                      })}
                    </>
                  );
                })()}
              </g>
            </svg>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Rotación (salidas) por producto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto">
              <table className="min-w-[600px] text-sm">
                <thead>
                  <tr className="text-left text-neutral-500">
                    <th className="px-2 py-1">ProductoId</th>
                    <th className="px-2 py-1">Salidas</th>
                  </tr>
                </thead>
                <tbody>
                  {rotation.map((r) => (
                    <tr key={r.productId} className="border-t">
                      <td className="px-2 py-1">{r.productId}</td>
                      <td className="px-2 py-1">{r.turnover}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end mt-2">
              <Button
                size="sm"
                variant="flat"
                onPress={() => dlCsv(rotation, "inv_rotacion.csv")}
              >
                CSV
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Stock bajo</CardTitle>
          </CardHeader>
          <CardContent>
            {k.data?.lowStock?.length ? (
              <div className="divide-y">
                {k.data.lowStock.map((r: any) => (
                  <div
                    key={r.product.id}
                    className="py-2 text-sm flex items-center justify-between"
                  >
                    <div>
                      {r.product.name}
                      {r.product.code ? ` [${r.product.code}]` : ""}
                    </div>
                    <div className="text-red-600">
                      {r.current} / mín {r.min}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-neutral-500">
                Sin productos con stock bajo.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
