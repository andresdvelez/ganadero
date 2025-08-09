"use client";

import { ReactNode, useState, useEffect } from "react";
import { UserButton } from "@clerk/nextjs";
import { Menu, RefreshCcw, Bell, Plus } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { getSyncManager } from "@/services/sync/sync-manager";
import { Button } from "@/components/ui/button";
import { ModuleLauncher } from "@/components/modules/module-launcher";
import { AISidebar } from "@/components/ai/ai-sidebar";
import { db, OfflineChat } from "@/lib/dexie";
import { useRouter } from "next/navigation";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [syncInfo, setSyncInfo] = useState({
    online: true,
    syncing: false,
    pending: 0,
    conflicts: 0,
  });
  const [chatList, setChatList] = useState<OfflineChat[]>([]);

  const hasClerk = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  useEffect(() => {
    const sm = getSyncManager();
    let mounted = true;
    const load = async () => {
      const [pending] = await Promise.all([sm.getPendingCount()]);
      if (!mounted) return;
      setSyncInfo({
        online: navigator.onLine,
        syncing: false,
        pending,
        conflicts: 0,
      });
      try {
        const items = await db.chats
          .orderBy("updatedAt")
          .reverse()
          .limit(50)
          .toArray();
        setChatList(items);
      } catch {}
    };
    load();
    const onOnline = () => setSyncInfo((s) => ({ ...s, online: true }));
    const onOffline = () => setSyncInfo((s) => ({ ...s, online: false }));
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const onOpenModules = () => setLauncherOpen(true);
    window.addEventListener("open-modules", onOpenModules as any);
    const onChatUpdated = () => load();
    window.addEventListener("ai-chat-updated", onChatUpdated as any);
    return () => {
      mounted = false;
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("open-modules", onOpenModules as any);
      window.removeEventListener("ai-chat-updated", onChatUpdated as any);
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-mesh">
      {/* Top header */}
      <header className="sticky top-0 z-20 ios-toolbar">
        <div className="flex h-14 items-center justify-between px-3 sm:px-5">
          {/* Left: Menú pill + logo */}
          <div className="flex items-center gap-3">
            <Button
              onPress={() => setLauncherOpen(true)}
              className="rounded-full bg-white/90 hover:bg-white shadow-sm px-3"
              aria-label="Abrir menú"
            >
              <Menu className="h-4 w-4 mr-2 text-slate-700" />
              <span className="text-[15px] text-slate-800">Menú</span>
            </Button>
            <Link
              href="/ai-assistant"
              className="inline-flex items-center gap-2"
            >
              <Image
                src="/logo.png"
                alt="Ganado AI"
                width={132}
                height={24}
                priority
                className="h-6 w-auto"
              />
            </Link>
          </div>

          {/* Right: bell, add, sync, user */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              isIconOnly
              variant="flat"
              className="relative rounded-full bg-white/90 hover:bg-white shadow-sm"
              aria-label="Notificaciones"
            >
              <Bell className="h-5 w-5 text-slate-700" />
              <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-pasture-500 ring-2 ring-white" />
            </Button>
            <Link href="/animals/new">
              <Button className="rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-sm">
                <span className="text-[15px]">Añadir ganado</span>
                <Plus className="h-4 w-4 ml-2" />
              </Button>
            </Link>
            <Button
              className="rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-sm"
              variant="flat"
              onPress={async () => {
                const sm = getSyncManager();
                setSyncInfo((s) => ({ ...s, syncing: true }));
                await sm.sync();
                const [pending] = await Promise.all([sm.getPendingCount()]);
                setSyncInfo({
                  online: navigator.onLine,
                  syncing: false,
                  pending,
                  conflicts: 0,
                });
              }}
              aria-label="Sincronizar"
            >
              <span className="text-[15px]">Sync</span>
              <RefreshCcw
                className={cn(
                  "h-4 w-4 ml-2",
                  syncInfo.syncing && "animate-spin"
                )}
              />
            </Button>
            {hasClerk && (
              <UserButton
                afterSignOutUrl="/sign-in"
                appearance={{ elements: { avatarBox: "h-8 w-8" } }}
              />
            )}
          </div>
        </div>
      </header>

      {/* Body with sidebar + content */}
      <div className="flex">
        <AISidebar
          chats={chatList.map((c) => ({
            uuid: c.uuid,
            title: c.title,
            updatedAt: c.updatedAt,
          }))}
          activeChatUuid={null}
          onNewChat={() => {
            router.push("/ai-assistant");
            window.dispatchEvent(new Event("ai-new-chat"));
          }}
          onSelectChat={(uuid) => {
            router.push("/ai-assistant");
            window.dispatchEvent(
              new CustomEvent("ai-open-chat", { detail: { uuid } })
            );
          }}
        />

        {/* Page content */}
        <main className="flex-1 p-3 sm:p-5">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>

      {/* Module launcher */}
      <ModuleLauncher
        open={launcherOpen}
        onClose={() => setLauncherOpen(false)}
      />
    </div>
  );
}
