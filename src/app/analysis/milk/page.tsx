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

export default function AnalysisMilkPage() {
  const [period, setPeriod] = useState<{ from?: string; to?: string }>({});
  const router = useRouter();
  const list = trpc.milk.list.useQuery({ limit: 300 });
  const k = trpc.milk.kpis.useQuery({
    from: period.from,
    to: period.to,
    top: 10,
  });
  const lineRef = useRef<SVGSVGElement | null>(null);
  const barRef = useRef<SVGSVGElement | null>(null);

  const perDay = useMemo(() => {
    const rows = (list.data || []).filter((r: any) => {
      const d = new Date(r.recordedAt);
      const f = period.from ? new Date(period.from) : null;
      const t = period.to ? new Date(period.to) : null;
      return (f ? d >= f : true) && (t ? d <= t : true);
    });
    const map = new Map<string, number>();
    rows.forEach((r: any) => {
      const d = new Date(r.recordedAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(d.getDate()).padStart(2, "0")}`;
      map.set(key, (map.get(key) || 0) + (r.liters || 0));
    });
    return Array.from(map.entries())
      .sort()
      .map(([x, y]) => ({ x, y }));
  }, [list.data, period]);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Análisis · Leche</h1>
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
            <Button
              size="sm"
              variant="flat"
              onPress={() => {
                list.refetch();
                k.refetch();
              }}
            >
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
                        module: "milk",
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
            <CardTitle>Litros por día</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-end gap-2 mb-2">
              <Button
                size="sm"
                variant="flat"
                onPress={() => dlCsv(perDay, "leche_litros_dia.csv")}
              >
                CSV
              </Button>
              <Button
                size="sm"
                variant="flat"
                onPress={() => dlSvg(lineRef.current, "leche_litros_dia.svg")}
              >
                SVG
              </Button>
              <Button
                size="sm"
                variant="flat"
                onPress={() => dlPng(lineRef.current, "leche_litros_dia.png")}
              >
                PNG
              </Button>
            </div>
            <svg ref={lineRef} width={800} height={280} role="img">
              <g transform={`translate(${32}, ${24})`}>
                {(() => {
                  const w = 800 - 64;
                  const h = 280 - 56;
                  const max = Math.max(1, ...perDay.map((d) => d.y));
                  const step = perDay.length > 1 ? w / (perDay.length - 1) : w;
                  const pts = perDay.map(
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
                        stroke="#2563EB"
                        strokeWidth={2}
                      />
                      {pts.map((p, i) => (
                        <circle
                          key={i}
                          cx={p[0]}
                          cy={p[1]}
                          r={3}
                          fill="#2563EB"
                        />
                      ))}
                      {perDay.map((d, i) => (
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
            <CardTitle>Top animales por litros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-end gap-2 mb-2">
              <Button
                size="sm"
                variant="flat"
                onPress={() =>
                  dlCsv(
                    (k.data?.topLiters || []).map((t: any) => ({
                      animal: `${t.animal?.name || "(sin nombre)"} #${
                        t.animal?.tagNumber || t.animalId
                      }`,
                      liters: t.liters,
                    })),
                    "leche_top_animales.csv"
                  )
                }
              >
                CSV
              </Button>
              <Button
                size="sm"
                variant="flat"
                onPress={() => dlSvg(barRef.current, "leche_top_animales.svg")}
              >
                SVG
              </Button>
              <Button
                size="sm"
                variant="flat"
                onPress={() => dlPng(barRef.current, "leche_top_animales.png")}
              >
                PNG
              </Button>
            </div>
            <svg ref={barRef} width={800} height={280} role="img">
              <g transform={`translate(${32}, ${24})`}>
                {(() => {
                  const rows = (k.data?.topLiters || []).map((t: any) => ({
                    label: t.animal?.tagNumber || t.animalId,
                    value: t.liters,
                  }));
                  const w = 800 - 64;
                  const h = 280 - 56;
                  const max = Math.max(1, ...rows.map((d) => d.value));
                  const bw = w / Math.max(1, rows.length);
                  return (
                    <>
                      <line x1={0} y1={h} x2={w} y2={h} stroke="#ddd" />
                      {rows.map((d, i) => {
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
                              fill="#16A34A"
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
