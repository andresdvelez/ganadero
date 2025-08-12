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
      </div>
    </DashboardLayout>
  );
}
