"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/dexie";

export const dynamic = "force-dynamic";

export default function SensorsPage() {
  const [sensors, setSensors] = useState<any[]>([]);

  useEffect(() => {
    db.sensors
      .toArray()
      .then(setSensors)
      .catch(() => setSensors([]));
  }, []);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Sensores</h1>
        <Card>
          <CardHeader>
            <CardTitle>Dispositivos</CardTitle>
          </CardHeader>
          <CardContent>
            {sensors.length === 0 ? (
              <div className="text-sm text-neutral-500">No hay sensores.</div>
            ) : (
              <ul className="space-y-2">
                {sensors.map((s) => (
                  <li key={s.uuid} className="py-2 border-b last:border-0">
                    <div className="text-sm font-medium">{s.name}</div>
                    <div className="text-xs text-neutral-500">
                      {s.type || "N/A"} · {s.status || "inactive"}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
