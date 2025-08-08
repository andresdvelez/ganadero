"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { db } from "@/lib/dexie";

export default function BreedingClient() {
  const [records, setRecords] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const list = await db.breedingRecords
        .orderBy("eventDate")
        .reverse()
        .toArray();
      setRecords(list);
    })();
  }, []);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">Reproducción</h1>
        {records.length === 0 ? (
          <p className="text-neutral-600">Sin datos de reproducción aún.</p>
        ) : (
          <ul className="space-y-2">
            {records.map((r) => (
              <li key={r.uuid} className="island p-3">
                <div className="text-sm text-neutral-500">{r.eventType}</div>
                <div className="font-medium">
                  {new Date(r.eventDate).toLocaleDateString()}
                </div>
                {r.notes ? (
                  <div className="text-neutral-600 text-sm">{r.notes}</div>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardLayout>
  );
}
