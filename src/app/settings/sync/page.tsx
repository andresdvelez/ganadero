"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db, getSyncState, setSyncState } from "@/lib/dexie";
import { useEffect, useState } from "react";
import { getSyncManager } from "@/services/sync/sync-manager";

export const dynamic = "force-dynamic";

export default function SyncSettingsPage() {
  const [auto, setAuto] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const s = await getSyncState();
      setAuto(s.autoSyncEnabled !== false);
      const last = await db.syncLogs
        .orderBy("startedAt")
        .reverse()
        .limit(50)
        .toArray();
      setLogs(last);
    })();
  }, []);

  const saveAuto = async (val: boolean) => {
    setAuto(val);
    await setSyncState({ autoSyncEnabled: val });
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Sincronización</h1>
        <Card>
          <CardHeader>
            <CardTitle>Preferencias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-sm">Sincronización automática</div>
              <Button
                size="sm"
                variant={auto ? "solid" : "flat"}
                onPress={() => saveAuto(!auto)}
              >
                {auto ? "Activada" : "Desactivada"}
              </Button>
            </div>
            <div className="mt-3">
              <Button
                size="sm"
                variant="flat"
                onPress={async () => {
                  const mgr = getSyncManager();
                  await mgr.sync();
                  const last = await db.syncLogs
                    .orderBy("startedAt")
                    .reverse()
                    .limit(50)
                    .toArray();
                  setLogs(last);
                }}
              >
                Sincronizar ahora
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Últimos registros</CardTitle>
          </CardHeader>
          <CardContent>
            {logs.length ? (
              <div className="text-sm divide-y">
                {logs.map((l) => (
                  <div
                    key={l.id}
                    className="py-2 flex items-center justify-between"
                  >
                    <div>
                      {new Date(l.startedAt).toLocaleString()} →{" "}
                      {l.endedAt ? new Date(l.endedAt).toLocaleString() : "-"}
                    </div>
                    <div>
                      ok:{String(l.ok)} · synced:{l.synced} · failed:{l.failed}{" "}
                      · conflicts:{l.conflicts}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-neutral-500">Sin registros.</div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
