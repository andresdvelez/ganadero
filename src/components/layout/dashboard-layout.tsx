"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { UserButton, useClerk } from "@clerk/nextjs";
import { getSyncManager } from "@/services/sync/sync-manager";
import { Button } from "@/components/ui/button";
import { addToast } from "@/components/ui/toast";
import { trpc } from "@/lib/trpc/client";
import { Select, SelectItem } from "@/components/ui/select";
import { HeroModal } from "@/components/ui/hero-modal";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { useUser } from "@clerk/nextjs";
import {
  provisionFromClerk,
  bindDeviceLocally,
  hasOfflineIdentity,
  lock,
} from "@/lib/auth/offline-auth";
import { robustDeviceId, isAppInstalledRuntime } from "@/lib/utils";
import { db } from "@/lib/dexie";
import {
  Home,
  Bot,
  Compass,
  CreditCard,
  Apple,
  Laptop,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

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
  const router = useRouter();
  const { signOut } = useClerk();
  const hasClerk = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const [syncStatus, setSyncStatus] = useState<{
    online: boolean;
    syncing: boolean;
    pending: number;
  }>({ online: true, syncing: false, pending: 0 });
  const [conflictsOpen, setConflictsOpen] = useState(false);
  const [offlineModalOpen, setOfflineModalOpen] = useState(false);
  const [offlineInfoOpen, setOfflineInfoOpen] = useState(false);
  const [showOfflineOverlay, setShowOfflineOverlay] = useState(false);
  const devicesQ = trpc.device.myDevices.useQuery();
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
    const onOfflineOverlay = () => {
      try {
        const last = Number(
          window.localStorage.getItem("OFFLINE_OVERLAY_ACK_AT") || "0"
        );
        const twelveHours = 12 * 60 * 60 * 1000;
        if (Date.now() - last > twelveHours) setShowOfflineOverlay(true);
      } catch {
        setShowOfflineOverlay(true);
      }
    };
    window.addEventListener("offline", onOfflineOverlay);
    if (typeof navigator !== "undefined" && !navigator.onLine)
      onOfflineOverlay();
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
      window.removeEventListener("offline", onOfflineOverlay);
      window.removeEventListener("sync:completed", onSyncCompleted as any);
    };
  }, []);

  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState<boolean>(false);
  // Persistir estado de plegado
  useEffect(() => {
    try {
      const s = window.localStorage.getItem("SIDEBAR_COLLAPSED");
      if (s) setCollapsed(s === "1");
    } catch {}
  }, []);
  useEffect(() => {
    try {
      window.localStorage.setItem("SIDEBAR_COLLAPSED", collapsed ? "1" : "0");
    } catch {}
  }, [collapsed]);

  const sidebarWidth = collapsed ? 72 : 260; // px
  const sidebarLeft = 8; // px gap para efecto flotante

  const navLinkClass = (href: string) => {
    const isActive =
      pathname === href || (href !== "/" && pathname.startsWith(href));
    return (
      (collapsed ? "flex justify-center " : "flex items-center ") +
      "gap-2 px-3 py-2 rounded-full transition-colors " +
      (isActive
        ? "bg-neutral-900 text-white"
        : "hover:bg-neutral-100 text-neutral-800")
    );
  };

  return (
    <div className="min-h-dvh">
      {/* Header se renderiza dentro del área principal, no ocupa encima del sidebar */}
      <div className="pt-0">
        {/* Sidebar flotante de altura completa */}
        <aside
          className="fixed top-0 z-40 my-3 border border-neutral-200/60 bg-white/70 backdrop-blur-md shadow-lg p-3 flex flex-col gap-3 overflow-auto rounded-2xl"
          style={{
            width: sidebarWidth,
            left: sidebarLeft,
            height: "98dvh",
            transition:
              "width 260ms cubic-bezier(0.22,1,0.36,1), left 260ms cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2 px-1">
              {collapsed ? (
                <Image
                  src="/brand/logotype-black-nobg.png"
                  alt="Ganado"
                  width={40}
                  height={40}
                  priority
                />
              ) : (
                <Image
                  src="/brand/full-logo-black-nobg.png"
                  alt="Ganado"
                  width={160}
                  height={36}
                  priority
                />
              )}
            </div>
            {/* Botón interno opcional (no necesario, mantenemos foco en el flotante) */}
          </div>
          <nav className="space-y-1">
            <Link href="/" className={navLinkClass("/")} title="Inicio">
              <Home className="w-4 h-4" />
              {!collapsed && <span>Inicio</span>}
            </Link>
            <Link
              href="/ai-assistant"
              className={navLinkClass("/ai-assistant")}
              title="Asistente de AI"
            >
              <Bot className="w-4 h-4" />
              {!collapsed && <span>Asistente de AI</span>}
            </Link>
            <button
              className={
                (collapsed ? "justify-center " : "") +
                "flex items-center gap-2 px-3 py-2 rounded-full hover:bg-neutral-100 text-neutral-800 w-full text-left"
              }
              onClick={() => {
                try {
                  router.push("/modules");
                } catch {
                  window.location.href = "/modules";
                }
              }}
              title="Navegador de módulos"
            >
              <Compass className="w-4 h-4" />
              {!collapsed && <span>Navegador de módulos</span>}
            </button>
            <Link
              href="/settings/billing"
              className={navLinkClass("/settings/billing")}
              title="Plan y facturación"
            >
              <CreditCard className="w-4 h-4" />
              {!collapsed && <span>Plan y facturación</span>}
            </Link>
          </nav>
          {!collapsed && (
            <>
              <div className="mt-2">
                <div className="text-xs uppercase tracking-wide text-neutral-500 px-1">
                  Chats recientes
                </div>
                <RecentChats />
                <div className="px-1 mt-2">
                  <a
                    className="text-sm text-primary-600 hover:underline"
                    href="/ai-assistant?history=1"
                  >
                    Ver todo
                  </a>
                </div>
              </div>
              {(() => {
                const installed = isAppInstalledRuntime();
                if (installed) return null;
                return (
                  <div className="mt-auto pt-2 border-t">
                    <div className="text-xs uppercase tracking-wide text-neutral-500 px-1 mb-2">
                      Descargas
                    </div>
                    {(() => {
                      const macUrl =
                        process.env.NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL ||
                        "/download";
                      const winUrl =
                        process.env.NEXT_PUBLIC_DESKTOP_WIN_DOWNLOAD_URL ||
                        "/download";
                      return (
                        <div className="flex flex-col gap-2">
                          <a
                            className="px-3 py-2 rounded-full bg-black text-white text-sm shadow hover:opacity-90 flex items-center gap-2"
                            href={macUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <img
                              src="/brand/apple-logo.svg"
                              alt="Apple"
                              className="w-4 h-4"
                            />
                            <span>Descargar para macOS</span>
                          </a>
                          <a
                            className="px-3 py-2 rounded-full bg-neutral-900 text-white text-sm shadow hover:opacity-90 flex items-center gap-2"
                            href={winUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <img
                              src="/brand/windows-logo.svg"
                              alt="Windows"
                              className="w-4 h-4"
                            />
                            <span>Descargar para Windows</span>
                          </a>
                        </div>
                      );
                    })()}
                  </div>
                );
              })()}
            </>
          )}
        </aside>
        {/* Botón flotante fijo para plegar/expandir (siempre visible) */}
        <button
          className="fixed z-50 w-8 h-8 grid place-items-center rounded-full shadow bg-white/90 hover:bg-white text-neutral-700 border border-neutral-200/70"
          style={{
            top: 16,
            left: sidebarLeft + sidebarWidth - 12,
            transition: "left 260ms cubic-bezier(0.22,1,0.36,1)",
          }}
          onClick={() => setCollapsed((v) => !v)}
          title={collapsed ? "Expandir" : "Plegar"}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>

        {/* Área principal a la derecha del sidebar */}
        <div
          className="transition-all"
          style={{
            marginLeft: sidebarLeft + sidebarWidth,
            transition: "margin-left 260ms cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          <header className="flex items-center justify-between px-4 h-14 bg-transparent">
            <div className="flex items-center gap-3">
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
              {(() => {
                const isDesktop =
                  typeof window !== "undefined" &&
                  (Boolean((window as any).__TAURI__) ||
                    (typeof navigator !== "undefined" &&
                      /Tauri/i.test(navigator.userAgent)));
                if (!isDesktop) return null;
                return (
                  <button
                    className="text-sm text-neutral-600 hover:text-neutral-900"
                    onClick={() => setOfflineModalOpen(true)}
                  >
                    Offline
                  </button>
                );
              })()}
              {hasClerk && (
                <div className="flex items-center gap-2">
                  <UserButton />
                  {!syncStatus.online && (
                    <>
                      <motion.button
                        className="relative px-2 py-1 rounded-full bg-[#2E77D0] text-white text-xs shadow"
                        title="Sin conexión: puedes seguir usando Ganado AI. Al reconectarte, sincronizaremos automáticamente tus datos y resultados de la IA."
                        onClick={() => setOfflineInfoOpen(true)}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                      >
                        Offline
                      </motion.button>
                      <Button
                        size="sm"
                        variant="light"
                        onPress={async () => {
                          if (!confirm("¿Cerrar sesión en modo offline?"))
                            return;
                          try {
                            try {
                              lock();
                            } catch {}
                            try {
                              window.localStorage.removeItem("ACTIVE_FARM_ID");
                            } catch {}
                            addToast({
                              variant: "success",
                              title: "Sesión cerrada (offline)",
                            });
                          } finally {
                            try {
                              window.location.href = "/device-unlock";
                            } catch {}
                          }
                        }}
                        title="Cerrar sesión (offline)"
                      >
                        Cerrar sesión
                      </Button>
                    </>
                  )}
                </div>
              )}
            </nav>
          </header>
          <main className="relative p-4 overflow-auto min-h-[100dvh] transition-all">
            {/* Puntos difuminados de fondo para reforzar efecto glass */}
            <div className="pointer-events-none fixed inset-0 -z-10">
              <div className="absolute top-28 left-40 h-72 w-72 rounded-full bg-emerald-200/25 blur-3xl" />
              <div className="absolute bottom-24 right-32 h-96 w-96 rounded-full bg-sky-200/20 blur-3xl" />
              <div className="absolute top-1/2 left-1/3 h-64 w-64 -translate-y-1/2 rounded-full bg-amber-200/20 blur-3xl" />
            </div>
            <div className="max-w-[1400px] mx-auto space-y-4">{children}</div>
          </main>
        </div>
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

      {/* Modal informativo rápido sobre modo offline */}
      {offlineInfoOpen && (
        <HeroModal
          open={offlineInfoOpen}
          onClose={() => setOfflineInfoOpen(false)}
          title="Modo sin conexión"
        >
          <motion.div
            className="text-sm text-neutral-700 space-y-2"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p>
              Estás usando Ganado AI sin conexión. Puedes continuar operando con
              normalidad.
            </p>
            <p>
              Cuando recuperes Internet, sincronizaremos automáticamente tus
              datos y los resultados generados por la IA.
            </p>
            <p>
              Si instalaste la app de escritorio, podrás seguir usando nuestro
              modelo de IA local sin Internet.
            </p>
            <div className="mt-3 flex justify-end">
              <Button onPress={() => setOfflineInfoOpen(false)}>
                Entendido
              </Button>
            </div>
          </motion.div>
        </HeroModal>
      )}

      {/* Overlay de entrada en modo offline (se muestra máx. cada 12h) */}
      <AnimatePresence>
        {showOfflineOverlay && (
          <motion.div
            className="fixed inset-0 z-[60] grid place-items-center bg-black/75"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="text-center max-w-2xl mx-auto px-6"
              initial={{ y: 16, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -8, opacity: 0, scale: 0.98 }}
              transition={{
                type: "spring",
                stiffness: 420,
                damping: 32,
                mass: 0.8,
              }}
            >
              <div className="mx-auto mb-6 w-28 h-28 rounded-full border-8 border-neutral-500 grid place-items-center">
                <motion.div
                  className="w-10 h-10 border-b-4 border-neutral-400 rounded-full"
                  animate={{ rotate: 360 }}
                  transition={{
                    repeat: Infinity,
                    ease: "linear",
                    duration: 1.2,
                  }}
                />
              </div>
              <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-3">
                No tienes conexión a Internet
              </h2>
              <p className="text-neutral-200 text-base md:text-lg mb-6">
                Puedes seguir usando Ganado AI con normalidad. Cuando vuelvas a
                tener conexión, sincronizaremos automáticamente tus datos y los
                resultados generados por la inteligencia artificial. Si tienes
                la app de escritorio instalada, el modelo local seguirá
                funcionando sin conexión.
              </p>
              <Button
                color="primary"
                onPress={() => {
                  try {
                    window.localStorage.setItem(
                      "OFFLINE_OVERLAY_ACK_AT",
                      String(Date.now())
                    );
                  } catch {}
                  setShowOfflineOverlay(false);
                }}
              >
                Continuar al dashboard
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {offlineModalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">Dispositivos y acceso offline</div>
              <button
                className="text-sm"
                onClick={() => setOfflineModalOpen(false)}
              >
                Cerrar
              </button>
            </div>
            <div className="text-sm text-neutral-600 mb-3">
              Administra los dispositivos vinculados a tu cuenta y el estado de
              su clave local.
            </div>
            <DevicesManager onClose={() => setOfflineModalOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

function RecentChats() {
  const [items, setItems] = useState<
    Array<{ uuid: string; title: string; updatedAt: Date }>
  >([]);
  useEffect(() => {
    (async () => {
      try {
        const rows = await db.chats
          .orderBy("updatedAt")
          .reverse()
          .limit(5)
          .toArray();
        setItems(rows as any);
      } catch {}
    })();
  }, []);
  if (!items.length)
    return <div className="text-sm text-neutral-500 px-2 py-3">Sin chats</div>;
  return (
    <div className="space-y-1 mt-1">
      {items.map((c) => (
        <button
          key={c.uuid}
          className="w-full text-left px-3 py-2 rounded-lg hover:bg-neutral-100"
          onClick={() =>
            window.dispatchEvent(
              new CustomEvent("ai-open-chat", { detail: { uuid: c.uuid } })
            )
          }
        >
          <div className="text-sm font-medium text-neutral-800 line-clamp-2">
            {c.title}
          </div>
          <div className="text-[11px] text-neutral-500">
            {new Date(c.updatedAt).toLocaleString()}
          </div>
        </button>
      ))}
    </div>
  );
}

function DevicesManager({ onClose }: { onClose: () => void }) {
  const { user } = useUser();
  const utils = trpc.useUtils();
  const devicesQ = trpc.device.myDevices.useQuery();
  const setPassStatus = trpc.device.setPasscodeStatus.useMutation({
    onSuccess() {
      utils.device.myDevices.invalidate();
    },
  });
  const reqReset = trpc.device.requestPasscodeReset.useMutation({
    onSuccess(res) {
      addToast({
        variant: "success",
        title: "Código enviado",
        description: `Código: ${res.code}`,
      });
      utils.device.myDevices.invalidate();
    },
  });
  const applyReset = trpc.device.resetPasscode.useMutation({
    onSuccess() {
      addToast({ variant: "success", title: "Clave actualizada" });
      utils.device.myDevices.invalidate();
    },
  });
  const registerDevice = trpc.device.register.useMutation({
    onSuccess() {
      utils.device.myDevices.invalidate();
    },
    onError(e) {
      addToast({
        variant: "error",
        title: "No se pudo vincular",
        description: e.message,
      });
    },
  });
  const deleteDevice = trpc.device.delete.useMutation({
    onSuccess() {
      utils.device.myDevices.invalidate();
      addToast({
        variant: "success",
        title: "Dispositivo eliminado de la cuenta",
      });
    },
    onError(e) {
      addToast({
        variant: "error",
        title: "No se pudo eliminar",
        description: e.message,
      });
    },
  });

  const [editing, setEditing] = useState<{
    deviceId: string;
    code: string;
    passA: string;
    passB: string;
  } | null>(null);
  const [currentId, setCurrentId] = useState<string>("");
  const [currentHasLocal, setCurrentHasLocal] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        setCurrentHasLocal(await hasOfflineIdentity());
      } catch {}
      try {
        setCurrentId(robustDeviceId());
      } catch {}
    })();
  }, []);

  const [linkPassA, setLinkPassA] = useState("");
  const [linkPassB, setLinkPassB] = useState("");
  const [linkName, setLinkName] = useState("");
  const [linking, setLinking] = useState(false);
  const ownershipQ = trpc.device.checkOwnership.useQuery(
    { deviceId: currentId },
    { enabled: !!currentId }
  );

  if (devicesQ.isLoading) return <div className="text-sm">Cargando…</div>;
  const list = devicesQ.data || [];
  return (
    <div className="space-y-3">
      {/* Bloque para vincular el equipo actual si aún no está en la lista */}
      {list.findIndex((d) => d.deviceId === currentId) === -1 && (
        <div className="rounded-lg border p-3 bg-white">
          <div className="text-sm font-medium mb-2">Vincular este equipo</div>
          <div className="grid sm:grid-cols-3 gap-2 mb-2">
            <Input
              label="Nombre del dispositivo"
              placeholder="Ej. Mac oficina"
              value={linkName}
              onChange={(e) =>
                setLinkName((e.target as HTMLInputElement).value)
              }
            />
            <Input
              type="password"
              label="Clave local (opcional)"
              placeholder="••••••"
              value={linkPassA}
              onChange={(e) =>
                setLinkPassA((e.target as HTMLInputElement).value)
              }
            />
            <Input
              type="password"
              label="Confirmar clave"
              placeholder="••••••"
              value={linkPassB}
              onChange={(e) =>
                setLinkPassB((e.target as HTMLInputElement).value)
              }
            />
          </div>
          {ownershipQ.data?.exists && ownershipQ.data?.sameUser === false && (
            <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
              Este dispositivo ya está vinculado a otra cuenta
              {ownershipQ.data.ownerEmail
                ? ` (${ownershipQ.data.ownerEmail})`
                : ""}
              . Para traerlo a tu cuenta, ingresa la clave local (si tenía) y
              pulsa “Vincular este equipo”.
            </div>
          )}
          <div className="flex justify-end">
            <Button
              color="primary"
              isLoading={registerDevice.isPending || linking}
              onPress={async () => {
                if (!user)
                  return addToast({
                    variant: "warning",
                    title: "Inicia sesión",
                  });
                setLinking(true);
                try {
                  // 1) Asociar localmente el dispositivo a este usuario primero
                  await bindDeviceLocally({
                    deviceId: currentId,
                    clerkId: user.id,
                    name: linkName || "Este equipo",
                    platform:
                      typeof navigator !== "undefined"
                        ? navigator.platform
                        : "web",
                  });
                  // 2) Guardar identidad local si se ingresó clave (después del bind)
                  if (linkPassA || linkPassB) {
                    if (linkPassA.length < 6) {
                      addToast({
                        variant: "warning",
                        title: "La clave debe tener al menos 6 caracteres",
                      });
                      setLinking(false);
                      return;
                    }
                    if (linkPassA !== linkPassB) {
                      addToast({
                        variant: "warning",
                        title: "Las claves no coinciden",
                      });
                      setLinking(false);
                      return;
                    }
                    await provisionFromClerk({
                      clerkId: user.id,
                      email: user.primaryEmailAddress?.emailAddress,
                      name: user.fullName ?? undefined,
                      avatarUrl: user.imageUrl,
                      passcode: linkPassA,
                    });
                  }
                  await registerDevice.mutateAsync({
                    deviceId: currentId,
                    name: linkName || "Este equipo",
                    platform:
                      typeof navigator !== "undefined"
                        ? navigator.platform
                        : "web",
                  });
                  if (linkPassA && linkPassA.length >= 6) {
                    try {
                      await setPassStatus.mutateAsync({
                        deviceId: currentId,
                        hasPasscode: true,
                      });
                    } catch {}
                  }
                  setCurrentHasLocal(true);
                  setLinkPassA("");
                  setLinkPassB("");
                  setLinkName("");
                  addToast({ variant: "success", title: "Equipo vinculado" });
                } catch (e: any) {
                  addToast({
                    variant: "error",
                    title: "No se pudo vincular",
                    description: e?.message,
                  });
                } finally {
                  setLinking(false);
                  try {
                    await utils.device.myDevices.invalidate();
                  } catch {}
                }
              }}
            >
              Vincular este equipo
            </Button>
          </div>
        </div>
      )}
      {list.length === 0 ? (
        <div className="text-neutral-500">No hay dispositivos vinculados.</div>
      ) : (
        <div className="divide-y">
          {list.map((d) => (
            <div
              key={d.deviceId}
              className="py-3 flex items-start justify-between gap-4"
            >
              <div>
                <div className="font-medium flex items-center gap-2">
                  <span>{d.name || d.deviceId}</span>
                  {currentId === d.deviceId && (
                    <span className="px-2 py-0.5 text-[10px] rounded-full bg-neutral-100 border text-neutral-600">
                      Este equipo
                    </span>
                  )}
                </div>
                <div className="text-xs text-neutral-600">
                  {d.platform || ""}
                </div>
                <div className="text-xs mt-1">
                  Estado:{" "}
                  {d.hasPasscode ||
                  (currentId === d.deviceId && currentHasLocal)
                    ? "Con clave local"
                    : "Sin clave local"}
                  {d.resetPending ? " · reset pendiente" : ""}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="flat"
                  onPress={() =>
                    setEditing({
                      deviceId: d.deviceId,
                      code: "",
                      passA: "",
                      passB: "",
                    })
                  }
                >
                  Editar clave
                </Button>
                <Button
                  size="sm"
                  variant="light"
                  onPress={async () => {
                    if (currentId === d.deviceId && user) {
                      // provisionar directamente para este equipo
                      const pass = prompt("Nueva clave (mín. 6)") || "";
                      if (pass.length < 6) return;
                      await provisionFromClerk({
                        clerkId: user.id,
                        email: user.primaryEmailAddress?.emailAddress,
                        name: user.fullName ?? undefined,
                        avatarUrl: user.imageUrl,
                        passcode: pass,
                      });
                      addToast({
                        variant: "success",
                        title: "Clave guardada en este equipo",
                      });
                      try {
                        await setPassStatus.mutateAsync({
                          deviceId: currentId,
                          hasPasscode: true,
                        });
                      } catch {}
                      await utils.device.myDevices.invalidate();
                    } else {
                      await reqReset.mutateAsync({ deviceId: d.deviceId });
                    }
                  }}
                >
                  Recuperar / Reset
                </Button>
                {currentId === d.deviceId && (
                  <Button
                    size="sm"
                    color="danger"
                    variant="light"
                    onPress={async () => {
                      try {
                        // Limpiar datos locales: binding, identidad y el identificador persistente
                        await db.deviceInfo
                          .where({ deviceId: currentId })
                          .delete();
                        await db.identities.clear();
                        try {
                          window.localStorage.removeItem("_device_uid");
                          window.localStorage.removeItem("_device_id"); // legacy
                        } catch {}
                        try {
                          lock();
                        } catch {}
                        setCurrentHasLocal(false);
                        // Recalcular el currentId para que deje de marcar "Este equipo"
                        try {
                          setCurrentId(robustDeviceId());
                        } catch {}
                        await utils.device.myDevices.invalidate();
                        addToast({
                          variant: "success",
                          title: "Equipo desvinculado localmente",
                        });
                      } catch (e: any) {
                        addToast({
                          variant: "error",
                          title: "No se pudo desvincular",
                          description: e?.message,
                        });
                      }
                    }}
                  >
                    Desvincular este equipo
                  </Button>
                )}
                {/* Eliminar de la cuenta (no depende de ser el equipo actual) */}
                <Button
                  size="sm"
                  color="danger"
                  variant="flat"
                  onPress={async () => {
                    if (!confirm("¿Eliminar este dispositivo de la cuenta?"))
                      return;
                    await deleteDevice.mutateAsync({ deviceId: d.deviceId });
                  }}
                >
                  Eliminar de la cuenta
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="border rounded-lg p-3 space-y-2">
          <div className="text-sm font-medium">Actualizar clave</div>
          <Input
            label="Código de 6 dígitos (correo)"
            value={editing.code}
            onChange={(e) =>
              setEditing({
                ...editing,
                code: (e.target as HTMLInputElement).value,
              })
            }
          />
          <div className="grid sm:grid-cols-2 gap-2">
            <Input
              type="password"
              label="Nueva clave"
              value={editing.passA}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  passA: (e.target as HTMLInputElement).value,
                })
              }
            />
            <Input
              type="password"
              label="Confirmar clave"
              value={editing.passB}
              onChange={(e) =>
                setEditing({
                  ...editing,
                  passB: (e.target as HTMLInputElement).value,
                })
              }
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="bordered" onPress={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button
              color="primary"
              isLoading={applyReset.isPending}
              onPress={async () => {
                if (
                  editing.passA.length < 6 ||
                  editing.passA !== editing.passB
                ) {
                  addToast({
                    variant: "warning",
                    title: "Valida la nueva clave",
                  });
                  return;
                }
                await applyReset.mutateAsync({
                  deviceId: editing.deviceId,
                  code: editing.code,
                });
                setEditing(null);
              }}
            >
              Guardar
            </Button>
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
  }, [activeFarmId, farmsQ.data, myRole, prompted]);

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
          // Invalida queries para que el header x-farm-id se aplique en siguientes requests
          try {
            const ev = new Event("farm:changed");
            window.dispatchEvent(ev);
          } catch {}
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
