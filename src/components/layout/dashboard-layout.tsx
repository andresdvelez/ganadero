"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { UserButton } from "@clerk/nextjs";
import { getSyncManager } from "@/services/sync/sync-manager";
import { db } from "@/lib/dexie";
import { Button } from "@/components/ui/button";
import { addToast } from "@/components/ui/toast";
import { trpc } from "@/lib/trpc/client";
import { Select, SelectItem } from "@/components/ui/select";
import { HeroModal } from "@/components/ui/hero-modal";
import { Input } from "@/components/ui/input";

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
  const [hasConflicts, setHasConflicts] = useState(false);
  useEffect(() => {
    const mgr = getSyncManager();
    const refresh = async () => {
      const st = mgr.getSyncStatus();
      const pending = await db.syncQueue
        .where("status")
        .anyOf(["pending", "failed"])
        .count();
      const conflictsCount = await db.syncQueue
        .where("status")
        .equals("conflict")
        .count();
      setHasConflicts(conflictsCount > 0);
      setSyncStatus({ online: st.isOnline, syncing: st.isSyncing, pending });
    };
    const t = setInterval(refresh, 5000);
    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    const onSyncCompleted = async (e: any) => {
      const { synced, failed, conflicts } = e.detail || {};
      addToast({
        variant: failed > 0 || conflicts > 0 ? "warning" : "success",
        title: "Sincronización completada",
        description: `Sincronizados: ${synced} · Fallidos: ${failed} · Conflictos: ${conflicts}`,
      });
      refresh();
    };
    window.addEventListener("sync:completed", onSyncCompleted as any);
    refresh();
    return () => {
      clearInterval(t);
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", refresh);
      window.removeEventListener("sync:completed", onSyncCompleted as any);
    };
  }, []);

  return (
    <div className="min-h-screen grid grid-rows-[auto,1fr]">
      <header className="flex items-center justify-between px-4 h-14 border-b bg-white">
        <div className="flex items-center gap-2">
          <Image src="/logo.png" alt="Ganado AI" width={28} height={28} />
          <div className="font-semibold">Ganado AI</div>
          {/* Selector de finca (solo ADMIN) */}
          <FarmSelector />
        </div>
        <nav className="flex items-center gap-3">
          {hasConflicts && (
            <div className="flex items-center gap-2">
              <div
                className="text-xs px-2 py-1 rounded-full bg-red-50 text-red-700 border border-red-200"
                title="Existen conflictos pendientes por resolver"
              >
                Conflictos
              </div>
              <Button
                size="sm"
                variant="light"
                onPress={async () => {
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
                Ver conflictos
              </Button>
            </div>
          )}
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

function FarmSelector() {
  const orgs = trpc.org.myOrganizations.useQuery();
  const orgId = useMemo(() => orgs.data?.[0]?.id ?? "", [orgs.data]);
  const myRole = useMemo(() => orgs.data?.[0]?.role ?? null, [orgs.data]);
  const farmsQ = trpc.farm.list.useQuery({ orgId }, { enabled: !!orgId });

  const [activeFarmId, setActiveFarmId] = useState<string | null>(null);
  const [openCreate, setOpenCreate] = useState(false);
  const [prompted, setPrompted] = useState(false);
  const [form, setForm] = useState<{ code: string; name: string }>({
    code: "",
    name: "",
  });
  const createFarm = trpc.farm.create.useMutation({
    onSuccess(f) {
      addToast({ variant: "success", title: "Finca creada" });
      try {
        window.localStorage.setItem("ACTIVE_FARM_ID", f.id);
      } catch {}
      setActiveFarmId(f.id);
      farmsQ.refetch();
      setOpenCreate(false);
    },
    onError(e) {
      addToast({
        variant: "error",
        title: "No se pudo crear",
        description: e.message,
      });
    },
  });

  // Cargar selección guardada
  useEffect(() => {
    try {
      const s = window.localStorage.getItem("ACTIVE_FARM_ID");
      if (s) setActiveFarmId(s);
    } catch {}
  }, []);

  // Si no hay selección, tomar la primera finca
  useEffect(() => {
    if (!activeFarmId && farmsQ.data && farmsQ.data.length > 0) {
      setActiveFarmId(farmsQ.data[0]!.id);
      try {
        window.localStorage.setItem("ACTIVE_FARM_ID", farmsQ.data[0]!.id);
      } catch {}
    }
    // Si no hay fincas y es ADMIN, abrir modal de creación una sola vez
    if (
      !prompted &&
      myRole === "ADMIN" &&
      farmsQ.data &&
      farmsQ.data.length === 0
    ) {
      setPrompted(true);
      setOpenCreate(true);
    }
  }, [activeFarmId, farmsQ.data]);

  if (myRole !== "ADMIN") return null;

  const farms = farmsQ.data || [];
  const selectedKeys = activeFarmId
    ? new Set([activeFarmId])
    : new Set<string>();

  return (
    <div className="ml-3 hidden sm:flex items-center gap-2">
      <Select
        aria-label="Seleccionar finca activa"
        size="sm"
        className="min-w-[220px]"
        selectedKeys={selectedKeys as any}
        placeholder={farms.length ? "Finca activa" : "Sin fincas"}
        onSelectionChange={(keys) => {
          const id = Array.from(keys as Set<string>)[0] || "";
          const nextId = id || null;
          setActiveFarmId(nextId);
          try {
            if (nextId) window.localStorage.setItem("ACTIVE_FARM_ID", nextId);
            else window.localStorage.removeItem("ACTIVE_FARM_ID");
          } catch {}
          const chosen = farms.find((f) => f.id === nextId);
          if (chosen) {
            addToast({
              variant: "info",
              title: "Finca activa",
              description: `${chosen.code} — ${chosen.name}`,
            });
          }
        }}
      >
        {farms.map((f) => (
          <SelectItem key={f.id} textValue={`${f.code} — ${f.name}`}>
            {f.code} — {f.name}
          </SelectItem>
        ))}
      </Select>
      <Button size="sm" variant="light" onPress={() => setOpenCreate(true)}>
        Crear finca
      </Button>

      <HeroModal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        title="Crear finca"
      >
        <div className="grid grid-cols-1 gap-3">
          <Input
            label="Código"
            value={form.code}
            onChange={(e) =>
              setForm({ ...form, code: (e.target as HTMLInputElement).value })
            }
          />
          <Input
            label="Nombre"
            value={form.name}
            onChange={(e) =>
              setForm({ ...form, name: (e.target as HTMLInputElement).value })
            }
          />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="bordered" onPress={() => setOpenCreate(false)}>
            Cancelar
          </Button>
          <Button
            color="primary"
            isLoading={createFarm.isPending}
            onPress={() => {
              if (!orgId) return;
              if (!form.code || !form.name) {
                addToast({
                  variant: "warning",
                  title: "Completa código y nombre",
                });
                return;
              }
              createFarm.mutate({ orgId, code: form.code, name: form.name });
            }}
          >
            Guardar
          </Button>
        </div>
      </HeroModal>
    </div>
  );
}
