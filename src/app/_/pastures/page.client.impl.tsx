"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { db } from "@/lib/dexie";
import { useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";

export default function PasturesClient() {
  const [pastures, setPastures] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const params = useSearchParams();
  const events = trpc.pasturesAdv.listEvents.useQuery({ limit: 20 });
  const measurements = trpc.pasturesAdv.listMeasurements.useQuery({
    limit: 20,
  });

  useEffect(() => {
    (async () => {
      const list = await db.pastures.orderBy("name").toArray();
      setPastures(list);
    })();
  }, []);

  useEffect(() => {
    const qp = params.get("q");
    if (qp != null) setQ(qp);
  }, [params]);

  const filtered = pastures.filter((p) =>
    [p.name, p.currentGroup].some((v: string) =>
      v?.toLowerCase().includes(q.toLowerCase())
    )
  );

  return (
    <DashboardLayout>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Potreros</h1>
          <input
            className="px-3 py-2 border rounded-lg"
            placeholder="Buscar potrero o grupo..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        {filtered.length === 0 ? (
          <p className="text-neutral-600">Sin potreros.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((p) => (
              <div key={p.uuid} className="island p-4">
                <div className="font-semibold">{p.name}</div>
                {p.areaHa ? (
                  <div className="text-sm text-neutral-600">
                    Área: {p.areaHa} ha
                  </div>
                ) : null}
                {p.currentGroup ? (
                  <div className="text-sm">Ocupación: {p.currentGroup}</div>
                ) : (
                  <div className="text-sm text-neutral-500">Disponible</div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 grid md:grid-cols-2 gap-4">
          <div className="island p-4">
            <div className="font-semibold mb-2">Eventos recientes (PRV)</div>
            {events.data?.length ? (
              <div className="text-sm divide-y">
                {events.data.map((e) => (
                  <div
                    key={`${e.pastureId}_${e.date}_${e.type}`}
                    className="py-1"
                  >
                    {e.type} · {new Date(e.date).toLocaleString()}
                    {e.groupName ? ` · ${e.groupName}` : ""}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-neutral-500">Sin eventos</div>
            )}
          </div>
          <div className="island p-4">
            <div className="font-semibold mb-2">Mediciones recientes</div>
            {measurements.data?.length ? (
              <div className="text-sm divide-y">
                {measurements.data.map((m) => (
                  <div key={`${m.pastureId}_${m.date}`} className="py-1">
                    {new Date(m.date).toLocaleDateString()} · Forraje:{" "}
                    {m.forageKgDMHa ?? "-"} kg MS/ha · Descanso:{" "}
                    {m.restDays ?? "-"} d
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-neutral-500">Sin mediciones</div>
            )}
          </div>
        </div>

        <div className="mt-6 island p-4">
          <div className="font-semibold mb-2">Calendario PRV (14 días)</div>
          <div className="text-xs text-neutral-600 mb-2">
            {(() => {
              const days = Array.from({ length: 14 }).map((_, i) => {
                const d = new Date();
                d.setDate(d.getDate() + i);
                const dayStr = d.toISOString().slice(0, 10);
                const occ = (events.data || []).find(
                  (e: any) =>
                    new Date(e.date).toISOString().slice(0, 10) === dayStr
                );
                const meas = (measurements.data || []).find(
                  (m: any) =>
                    new Date(m.date).toISOString().slice(0, 10) === dayStr
                );
                return { occ: !!occ, rest: meas?.restDays ?? null };
              });
              const occCount = days.filter((d) => d.occ).length;
              const restVals = days
                .map((d) => d.rest)
                .filter((v) => typeof v === "number") as number[];
              const avgRest = restVals.length
                ? Math.round(
                    restVals.reduce((a, b) => a + b, 0) / restVals.length
                  )
                : 0;
              return (
                <span>
                  Ocupación: <b>{occCount}</b> días · Descanso promedio:{" "}
                  <b>{avgRest}</b> días
                </span>
              );
            })()}
          </div>
          <div className="grid grid-cols-7 gap-2 text-xs">
            {Array.from({ length: 14 }).map((_, i) => {
              const d = new Date();
              d.setDate(d.getDate() + i);
              const dayStr = d.toISOString().slice(0, 10);
              const occ = (events.data || []).find(
                (e: any) =>
                  new Date(e.date).toISOString().slice(0, 10) === dayStr
              );
              const meas = (measurements.data || []).find(
                (m: any) =>
                  new Date(m.date).toISOString().slice(0, 10) === dayStr
              );
              return (
                <div
                  key={i}
                  className={`border rounded-md p-2 ${
                    occ ? "bg-amber-50 border-amber-200" : "bg-white"
                  }`}
                >
                  <div className="font-medium">{d.toLocaleDateString()}</div>
                  <div className="mt-1 min-h-[24px]">
                    {occ
                      ? `${occ.type} ${
                          occ.groupName ? "· " + occ.groupName : ""
                        }`
                      : "Libre"}
                  </div>
                  {typeof meas?.restDays === "number" && (
                    <div className="mt-1 text-[10px] text-neutral-500">
                      Descanso: {meas.restDays} d
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-2 text-xs text-neutral-500">
            Amarillo: día con evento de ocupación/movimiento.
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
