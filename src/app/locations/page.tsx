"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/dexie";

export const dynamic = "force-dynamic";

export default function LocationsPage() {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    db.locations
      .toArray()
      .then(setItems)
      .catch(() => setItems([]));
  }, []);

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Ubicaciones</h1>
        <Card>
          <CardHeader>
            <CardTitle>Lugares del hato</CardTitle>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <div className="text-sm text-neutral-500">
                No hay ubicaciones.
              </div>
            ) : (
              <ul className="space-y-2">
                {items.map((l) => (
                  <li key={l.uuid} className="py-2 border-b last:border-0">
                    <div className="text-sm font-medium">{l.name}</div>
                    <div className="text-xs text-neutral-500">
                      {l.type || "-"}
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
