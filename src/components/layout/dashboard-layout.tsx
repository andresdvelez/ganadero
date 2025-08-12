"use client";

import { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { UserButton } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { getSyncManager } from "@/services/sync/sync-manager";
import { db } from "@/lib/dexie";
import { Button } from "@/components/ui/button";

interface DashboardLayoutProps {
  children: ReactNode;
  leftSlot?: ReactNode;
  rightSlot?: ReactNode;
}

export function DashboardLayout({
  children,
  leftSlot,
  rightSlot,
}: DashboardLayoutProps) {
  const hasClerk = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const [syncStatus, setSyncStatus] = useState<{
    online: boolean;
    syncing: boolean;
    pending: number;
  }>({ online: true, syncing: false, pending: 0 });
  const [conflictsOpen, setConflictsOpen] = useState(false);
  const [conflicts, setConflicts] = useState<any[]>([]);
  useEffect(() => {
    const mgr = getSyncManager();
    const refresh = async () => {
      const st = mgr.getSyncStatus();
      const pending = await db.syncQueue
        .where("status")
        .anyOf(["pending", "failed"])
        .count();
      setSyncStatus({ online: st.isOnline, syncing: st.isSyncing, pending });
    };
    const t = setInterval(refresh, 5000);
    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    refresh();
    return () => {
      clearInterval(t);
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", refresh);
    };
  }, []);

  return (
    <div className="min-h-screen grid grid-rows-[auto,1fr]">
      <header className="flex items-center justify-between px-4 h-14 border-b bg-white">
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="Ganado AI" width={28} height={28} />
          <div className="font-semibold">Ganado AI</div>
        </div>
        <nav className="flex items-center gap-3">
          <div
            className="text-xs px-2 py-1 rounded-full border"
            title={
              syncStatus.online
                ? syncStatus.syncing
                  ? "Sincronizando…"
                  : "Sincronizado"
                : "Sin conexión"
            }
          >
            {syncStatus.online
              ? syncStatus.syncing
                ? "Sincronizando…"
                : syncStatus.pending > 0
                ? `Pendiente: ${syncStatus.pending}`
                : "Sincronizado"
              : "Offline"}
          </div>
          <Button
            size="sm"
            variant="flat"
            onPress={async () => {
              const mgr = getSyncManager();
              await mgr.sync();
              const rows = await db.syncQueue
                .where("status")
                .anyOf(["conflict", "failed", "synced"])
                .reverse()
                .limit(20)
                .toArray();
              setConflicts(rows);
              setConflictsOpen(true);
            }}
          >
            Sincronizar ahora
          </Button>
          <Link
            href="/offline-setup"
            className="text-sm text-neutral-600 hover:text-neutral-900"
          >
            Offline
          </Link>
          {hasClerk && <UserButton />}
        </nav>
      </header>
      <div className="grid grid-cols-[auto,1fr,auto] min-h-0">
        {leftSlot ? (
          <div className="border-r bg-white/80 min-h-0">{leftSlot}</div>
        ) : (
          <div />
        )}
        <main className="p-4 overflow-auto min-h-0">{children}</main>
        {rightSlot ? (
          <div className="border-l bg-white/80 min-h-0">{rightSlot}</div>
        ) : (
          <div />
        )}
      </div>
      {conflictsOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">Resultado de sincronización</div>
              <button
                className="text-sm"
                onClick={() => setConflictsOpen(false)}
              >
                Cerrar
              </button>
            </div>
            <div className="text-sm text-neutral-600 mb-3">
              Últimos 20 elementos con estado conflict/failed/synced.
            </div>
            <div className="max-h-[50vh] overflow-auto text-sm">
              {conflicts.length ? (
                conflicts.map((c) => (
                  <div
                    key={c.id}
                    className="py-2 border-t flex items-center justify-between"
                  >
                    <div>
                      <div>
                        {c.entityType} · {c.operation} · {c.status}
                      </div>
                      {c.errorMessage && (
                        <div className="text-xs text-red-600">
                          {c.errorMessage}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {c.status !== "synced" && (
                        <Button
                          size="sm"
                          variant="flat"
                          onPress={async () => {
                            await db.syncQueue.update(c.id, {
                              status: "pending",
                              retryCount: 0,
                            });
                            const mgr = getSyncManager();
                            await mgr.sync();
                            const rows = await db.syncQueue
                              .where("status")
                              .anyOf(["conflict", "failed", "synced"])
                              .reverse()
                              .limit(20)
                              .toArray();
                            setConflicts(rows);
                          }}
                        >
                          Reintentar
                        </Button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-neutral-500">Sin elementos</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
