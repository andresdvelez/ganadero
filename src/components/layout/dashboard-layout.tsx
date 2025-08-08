"use client";

import { ReactNode } from "react";
import { UserButton } from "@clerk/nextjs";
import {
  Home,
  Home as Cow,
  Heart,
  Baby,
  Warehouse,
  DollarSign,
  FileText,
  Settings,
  MessageCircle,
  Menu,
  X,
  AlertTriangle,
  RefreshCcw,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { translations } from "@/lib/constants/translations";
import { useEffect } from "react";
import { getSyncManager } from "@/services/sync/sync-manager";

const navigation = [
  { name: translations.navigation.dashboard, href: "/", icon: Home },
  { name: translations.navigation.animals, href: "/animals", icon: Cow },
  { name: translations.navigation.health, href: "/health", icon: Heart },
  { name: translations.navigation.breeding, href: "/breeding", icon: Baby },
  {
    name: translations.navigation.inventory,
    href: "/inventory",
    icon: Warehouse,
  },
  { name: translations.navigation.finance, href: "/finance", icon: DollarSign },
  { name: translations.navigation.reports, href: "/reports", icon: FileText },
  { name: translations.navigation.settings, href: "/settings", icon: Settings },
];

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [syncInfo, setSyncInfo] = useState<{
    online: boolean;
    syncing: boolean;
    pending: number;
    conflicts: number;
  }>({ online: true, syncing: false, pending: 0, conflicts: 0 });
  const [showConflicts, setShowConflicts] = useState(false);
  const [conflicts, setConflicts] = useState<any[]>([]);

  useEffect(() => {
    const sm = getSyncManager();
    let mounted = true;
    const load = async () => {
      const [pending, conflictItems] = await Promise.all([
        sm.getPendingCount(),
        sm.getConflicts(),
      ]);
      if (!mounted) return;
      setConflicts(conflictItems);
      setSyncInfo({
        online: navigator.onLine,
        syncing: false,
        pending,
        conflicts: conflictItems.length,
      });
    };
    load();
    const onOnline = () => setSyncInfo((s) => ({ ...s, online: true }));
    const onOffline = () => setSyncInfo((s) => ({ ...s, online: false }));
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      mounted = false;
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-mesh">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 px-3 py-4 transform transition-transform duration-200 ease-in-out lg:translate-x-0",
          "ios-surface",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-2 py-2">
          <Link href="/" className="flex items-center gap-2">
            <Cow className="h-7 w-7 text-violet-600" />
            <span className="text-lg font-semibold text-slate-800">
              Ganado AI
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-full hover:bg-white/60"
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5 text-slate-600" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-2 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-xl",
                  isActive
                    ? "bg-white/80 shadow-sm text-slate-900"
                    : "hover:bg-white/60 text-slate-700"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span className="font-medium text-sm">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* AI Assistant CTA */}
        <div className="mt-auto p-3">
          <Link
            href="/ai-assistant"
            className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-md"
          >
            <MessageCircle className="h-5 w-5" />
            <span className="font-medium">{translations.ai.title}</span>
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-20 ios-toolbar">
          <div className="flex h-14 items-center justify-between px-3 sm:px-5">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-full hover:bg-white/60"
              aria-label="Abrir menú"
            >
              <Menu className="h-5 w-5 text-slate-700" />
            </button>

            <div className="flex items-center gap-3 text-sm">
              <div className="flex items-center gap-2">
                <div
                  className={`h-2 w-2 rounded-full ${
                    syncInfo.online ? "bg-green-500" : "bg-red-500"
                  } ${syncInfo.syncing ? "animate-pulse" : ""}`}
                />
                <span className="text-slate-600">
                  {syncInfo.online ? "En línea" : "Sin conexión"}
                </span>
              </div>
              <button
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/70 hover:bg-white shadow-sm"
                onClick={async () => {
                  const sm = getSyncManager();
                  setSyncInfo((s) => ({ ...s, syncing: true }));
                  const res = await sm.sync();
                  const [pending, conflictItems] = await Promise.all([
                    sm.getPendingCount(),
                    sm.getConflicts(),
                  ]);
                  setConflicts(conflictItems);
                  setSyncInfo({
                    online: navigator.onLine,
                    syncing: false,
                    pending,
                    conflicts: conflictItems.length,
                  });
                }}
                aria-label="Sincronizar"
              >
                <RefreshCcw
                  className={`h-4 w-4 ${
                    syncInfo.syncing ? "animate-spin" : ""
                  }`}
                />
                <span>
                  {syncInfo.syncing
                    ? "Sincronizando..."
                    : `Pendientes: ${syncInfo.pending}`}
                </span>
              </button>
              {syncInfo.conflicts > 0 && (
                <button
                  onClick={() => setShowConflicts(true)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200"
                  aria-label="Conflictos de sincronización"
                >
                  <AlertTriangle className="h-4 w-4" />
                  <span>{syncInfo.conflicts} conflictos</span>
                </button>
              )}
            </div>

            <UserButton
              afterSignOutUrl="/sign-in"
              appearance={{ elements: { avatarBox: "h-8 w-8" } }}
            />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-3 sm:p-5">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>

      {/* Conflicts modal */}
      {showConflicts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">
                Conflictos de sincronización
              </h3>
              <button
                className="p-1 rounded hover:bg-slate-100"
                onClick={() => setShowConflicts(false)}
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3 max-h-96 overflow-auto">
              {conflicts.length === 0 ? (
                <p className="text-sm text-slate-600">No hay conflictos.</p>
              ) : (
                conflicts.map((c) => (
                  <div
                    key={c.id}
                    className="border rounded-xl p-3 flex items-start justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm font-medium">{c.entityType}</p>
                      {c.errorMessage && (
                        <p className="text-xs text-slate-600 mt-1">
                          {c.errorMessage}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="px-3 py-1 rounded-lg bg-violet-600 text-white hover:bg-violet-700 text-sm"
                        onClick={async () => {
                          const sm = getSyncManager();
                          await sm.resolveConflict(c.id, "local");
                          const [pending, conflictItems] = await Promise.all([
                            sm.getPendingCount(),
                            sm.getConflicts(),
                          ]);
                          setConflicts(conflictItems);
                          setSyncInfo({
                            online: navigator.onLine,
                            syncing: false,
                            pending,
                            conflicts: conflictItems.length,
                          });
                        }}
                      >
                        Mantener local
                      </button>
                      <button
                        className="px-3 py-1 rounded-lg bg-slate-200 text-slate-800 hover:bg-slate-300 text-sm"
                        onClick={async () => {
                          const sm = getSyncManager();
                          await sm.resolveConflict(c.id, "remote");
                          const [pending, conflictItems] = await Promise.all([
                            sm.getPendingCount(),
                            sm.getConflicts(),
                          ]);
                          setConflicts(conflictItems);
                          setSyncInfo({
                            online: navigator.onLine,
                            syncing: false,
                            pending,
                            conflicts: conflictItems.length,
                          });
                        }}
                      >
                        Mantener remoto
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
