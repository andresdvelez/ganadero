"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { db } from "@/lib/dexie";
import { useSearchParams } from "next/navigation";

export default function MilkClient() {
  const [records, setRecords] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const params = useSearchParams();

  useEffect(() => {
    (async () => {
      const list = await db.milkRecords
        .orderBy("recordedAt")
        .reverse()
        .toArray();
      setRecords(list);
    })();
  }, []);

  useEffect(() => {
    const qp = params.get("q");
    if (qp != null) setQ(qp);
  }, [params]);

  const total = records.reduce((sum, r) => sum + (r.liters || 0), 0);
  const filtered = records.filter((r) => {
    const when = new Date(r.recordedAt).toLocaleDateString();
    return (
      r.session?.toLowerCase().includes(q.toLowerCase()) ||
      when.toLowerCase().includes(q.toLowerCase())
    );
  });

  return (
    <DashboardLayout>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Control Lechero</h1>
          <input className="px-3 py-2 border rounded-lg" placeholder="Buscar (AM/PM o fecha)..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="island p-4">Total registrado: {total.toFixed(1)} L</div>
        {filtered.length === 0 ? (
          <p className="text-neutral-600">Sin registros de leche.</p>
        ) : (
          <ul className="space-y-2">
            {filtered.map((r) => (
              <li
                key={r.uuid}
                className="island p-3 flex items-center justify-between"
              >
                <div>
                  <div className="text-sm text-neutral-500">{r.session}</div>
                  <div className="font-medium">
                    {new Date(r.recordedAt).toLocaleString()}
                  </div>
                </div>
                <div className="text-lg font-semibold">{r.liters} L</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardLayout>
  );
}
