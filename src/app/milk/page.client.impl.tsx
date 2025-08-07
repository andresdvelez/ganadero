"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { db } from "@/lib/dexie";

export default function MilkClient() {
  const [records, setRecords] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const list = await db.milkRecords
        .orderBy("recordedAt")
        .reverse()
        .toArray();
      setRecords(list);
    })();
  }, []);

  const total = records.reduce((sum, r) => sum + (r.liters || 0), 0);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">Control Lechero</h1>
        <div className="island p-4">Total registrado: {total.toFixed(1)} L</div>
        {records.length === 0 ? (
          <p className="text-neutral-600">Sin registros de leche.</p>
        ) : (
          <ul className="space-y-2">
            {records.map((r) => (
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
