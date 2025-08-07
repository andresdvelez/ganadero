"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { db } from "@/lib/dexie";

export default function PasturesClient() {
  const [pastures, setPastures] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const list = await db.pastures.orderBy("name").toArray();
      setPastures(list);
    })();
  }, []);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-4">
        <h1 className="text-2xl font-bold">Potreros</h1>
        {pastures.length === 0 ? (
          <p className="text-neutral-600">Sin potreros.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pastures.map((p) => (
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
