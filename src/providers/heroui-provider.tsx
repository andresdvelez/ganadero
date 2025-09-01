"use client";

import { HeroUIProvider } from "@heroui/system";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";
import { TRPCProvider } from "@/lib/trpc/provider";
import { AuthGate } from "./auth-gate";
import { OnboardingGate } from "./onboarding-gate";
import { ToastProvider } from "@/components/ui/toast";

export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const isTauri = typeof window !== "undefined" && (window as any).__TAURI__;
    if (isTauri) {
      // En Tauri, desregistrar cualquier SW previo para evitar precache/404
      try {
        navigator.serviceWorker
          ?.getRegistrations()
          .then((rs) => Promise.all(rs.map((r) => r.unregister())))
          .catch(() => {});
      } catch {}
      return;
    }
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => console.warn("SW registration failed", err));
    }
  }, []);

  return (
    <HeroUIProvider navigate={router.push} locale="es-CO">
      <TRPCProvider>
        <AuthGate />
        <OnboardingGate />
        <ToastProvider>{children}</ToastProvider>
      </TRPCProvider>
    </HeroUIProvider>
  );
}
