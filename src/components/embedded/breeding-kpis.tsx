"use client";

import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function BreedingKPIs() {
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const query = trpc.breedingAdv.kpis.useQuery({
    from: from || undefined,
    to: to || undefined,
  });

  const trend = query.data?.trend || [];
  const k = query.data?.kpis;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card>
          <CardHeader>
            <CardTitle>Días abiertos (prom.)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{k ? k.avgDaysOpen : "-"}</div>
            <div className="text-xs text-neutral-500">
              n={k?.samples.daysOpen || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tasa de preñez</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {k ? `${k.pregnancyRate}%` : "-"}
            </div>
            <div className="text-xs text-neutral-500">
              IA={k?.samples.inseminations || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>IEP (prom.)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {k ? k.avgCalvingInterval : "-"}
            </div>
            <div className="text-xs text-neutral-500">
              n={k?.samples.iep || 0}
            </div>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Tendencia de concepción (mensual)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full h-28">
            <svg width="100%" height="100%" viewBox="0 0 240 100">
              {(() => {
                if (!trend.length) return null;
                const max = Math.max(...trend.map((t) => t.value));
                const stepX = 240 / Math.max(1, trend.length - 1);
                const pts = trend.map((t, i) => {
                  const x = i * stepX;
                  const y = 100 - (t.value / Math.max(1, max)) * 80 - 10;
                  return `${x},${y}`;
                });
                return (
                  <>
                    <polyline
                      fill="none"
                      stroke="#16a34a"
                      strokeWidth="2"
                      points={pts.join(" ")}
                    />
                    {trend.map((t, i) => {
                      const x = i * stepX;
                      const y = 100 - (t.value / Math.max(1, max)) * 80 - 10;
                      return (
                        <circle key={i} cx={x} cy={y} r="2" fill="#16a34a" />
                      );
                    })}
                  </>
                );
              })()}
            </svg>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
