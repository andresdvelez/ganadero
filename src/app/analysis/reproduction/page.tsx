"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc/client";
import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export const dynamic = "force-dynamic";

function downloadSvg(node: SVGSVGElement | null, filename: string) {
  if (!node) return;
  const serializer = new XMLSerializer();
  const source = serializer.serializeToString(node);
  const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".svg") ? filename : `${filename}.svg`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
function downloadPngFromSvg(node: SVGSVGElement | null, filename: string) {
  if (!node) return;
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(node);
  const img = new Image();
  const svgBlob = new Blob([svgString], {
    type: "image/svg+xml;charset=utf-8",
  });
  const url = URL.createObjectURL(svgBlob);
  img.onload = () => {
    const w = Number(node.getAttribute("width") || 600);
    const h = Number(node.getAttribute("height") || 300);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = filename.endsWith(".png") ? filename : `${filename}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    }, "image/png");
  };
  img.src = url;
}
function downloadCsv(rows: Array<Record<string, any>>, filename: string) {
  if (!rows.length) return;
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
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function AnalysisReproductionPage() {
  const [period, setPeriod] = useState<{ from?: string; to?: string }>({});
  const router = useRouter();
  const query = trpc.breedingAdv.kpis.useQuery({
    from: period.from,
    to: period.to,
  });
  const trendRef = useRef<SVGSVGElement | null>(null);
  const barRef = useRef<SVGSVGElement | null>(null);

  const trendData = useMemo(
    () =>
      (query.data?.trend || []).map((t: any) => ({ x: t.period, y: t.value })),
    [query.data]
  );
  const iepData = useMemo(
    () =>
      (query.data?.iepByCategory || []).map((c: any) => ({
        label: c.label,
        value: c.avgIEP,
      })),
    [query.data]
  );

  return (
    <DashboardLayout>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Análisis · Reproducción</h1>
          <div className="flex items-center gap-2">
            <input
              aria-label="Desde"
              type="date"
              className="border rounded-md px-2 py-1 text-sm"
              value={period.from || ""}
              onChange={(e) =>
                setPeriod((p) => ({ ...p, from: e.target.value }))
              }
            />
            <input
              aria-label="Hasta"
              type="date"
              className="border rounded-md px-2 py-1 text-sm"
              value={period.to || ""}
              onChange={(e) => setPeriod((p) => ({ ...p, to: e.target.value }))}
            />
            <Button size="sm" variant="flat" onPress={() => query.refetch()}>
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
                  setPeriod({
                    from: d.toISOString().slice(0, 10),
                    to: d.toISOString().slice(0, 10),
                  });
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
                  setPeriod({
                    from: from.toISOString().slice(0, 10),
                    to: new Date().toISOString().slice(0, 10),
                  });
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
                  setPeriod({
                    from: from.toISOString().slice(0, 10),
                    to: new Date().toISOString().slice(0, 10),
                  });
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
                  setPeriod({
                    from: from.toISOString().slice(0, 10),
                    to: to.toISOString().slice(0, 10),
                  });
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
                        module: "breeding",
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card>
            <CardHeader>
              <CardTitle>KPIs</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm">
                Días abiertos prom.: <b>{query.data?.kpis?.avgDaysOpen ?? 0}</b>
              </div>
              <div className="text-sm">
                Tasa de preñez: <b>{query.data?.kpis?.pregnancyRate ?? 0}%</b>
              </div>
              <div className="text-sm">
                IEP prom.: <b>{query.data?.kpis?.avgCalvingInterval ?? 0}</b>{" "}
                días
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Concepciones por mes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-end gap-2 mb-2">
              <Button
                size="sm"
                variant="flat"
                onPress={() =>
                  downloadCsv(
                    query.data?.trend || [],
                    "repro_concepciones_mes.csv"
                  )
                }
              >
                CSV
              </Button>
              <Button
                size="sm"
                variant="flat"
                onPress={() =>
                  downloadSvg(trendRef.current, "repro_concepciones_mes.svg")
                }
              >
                SVG
              </Button>
              <Button
                size="sm"
                variant="flat"
                onPress={() =>
                  downloadPngFromSvg(
                    trendRef.current,
                    "repro_concepciones_mes.png"
                  )
                }
              >
                PNG
              </Button>
            </div>
            <svg ref={trendRef} width={800} height={280} role="img">
              <g transform={`translate(${32}, ${24})`}>
                {(() => {
                  const w = 800 - 64;
                  const h = 280 - 56;
                  const max = Math.max(1, ...trendData.map((d) => d.y));
                  const step =
                    trendData.length > 1 ? w / (trendData.length - 1) : w;
                  const pts = trendData.map(
                    (d, i) => [i * step, h - (d.y / max) * (h - 8)] as const
                  );
                  const path = pts
                    .map((p, i) =>
                      i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`
                    )
                    .join(" ");
                  return (
                    <>
                      <path
                        d={path}
                        fill="none"
                        stroke="#6D28D9"
                        strokeWidth={2}
                      />
                      {pts.map((p, i) => (
                        <circle
                          key={i}
                          cx={p[0]}
                          cy={p[1]}
                          r={3}
                          fill="#6D28D9"
                        />
                      ))}
                      {trendData.map((d, i) => (
                        <text
                          key={i}
                          x={i * step}
                          y={h + 14}
                          fontSize={11}
                          textAnchor="middle"
                          fill="#444"
                        >
                          {d.x}
                        </text>
                      ))}
                    </>
                  );
                })()}
              </g>
            </svg>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>IEP por raza</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-end gap-2 mb-2">
              <Button
                size="sm"
                variant="flat"
                onPress={() =>
                  downloadCsv(
                    query.data?.iepByCategory || [],
                    "repro_iep_por_raza.csv"
                  )
                }
              >
                CSV
              </Button>
              <Button
                size="sm"
                variant="flat"
                onPress={() =>
                  downloadSvg(barRef.current, "repro_iep_por_raza.svg")
                }
              >
                SVG
              </Button>
              <Button
                size="sm"
                variant="flat"
                onPress={() =>
                  downloadPngFromSvg(barRef.current, "repro_iep_por_raza.png")
                }
              >
                PNG
              </Button>
            </div>
            <svg ref={barRef} width={800} height={280} role="img">
              <g transform={`translate(${32}, ${24})`}>
                {(() => {
                  const w = 800 - 64;
                  const h = 280 - 56;
                  const max = Math.max(1, ...iepData.map((d) => d.value));
                  const bw = w / Math.max(1, iepData.length);
                  return (
                    <>
                      <line x1={0} y1={h} x2={w} y2={h} stroke="#ddd" />
                      {iepData.map((d, i) => {
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
                              fill="#10B981"
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
      </div>
    </DashboardLayout>
  );
}
