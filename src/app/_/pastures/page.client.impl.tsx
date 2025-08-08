"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { db } from "@/lib/dexie";
import { useSearchParams } from "next/navigation";

export default function PasturesClient() {
  const [pastures, setPastures] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const params = useSearchParams();

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
      </div>
    </DashboardLayout>
  );
}
