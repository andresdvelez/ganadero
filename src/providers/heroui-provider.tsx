"use client";

import { HeroUIProvider } from "@heroui/system";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { TRPCProvider } from "@/lib/trpc/provider";
import { AuthGate } from "./auth-gate";
import { OnboardingGate } from "./onboarding-gate";
import { ToastProvider } from "@/components/ui/toast";

export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [bootReady, setBootReady] = useState(false);

  useEffect(() => {
    const isTauri = typeof window !== "undefined" && (window as any).__TAURI__;
    // Esperar a que el boot local termine en Tauri antes de montar gates
    let iv: any;
    (function waitBoot() {
      try {
        if (!isTauri) {
          setBootReady(true);
          return;
        }
        let waited = 0;
        const step = 150;
        const maxMs = 6500;
        iv = setInterval(() => {
          try {
            // window.__BOOT_DONE__ lo setea el layout cuando termina preparación local
            if ((window as any).__BOOT_DONE__ === true || waited >= maxMs) {
              clearInterval(iv);
              setBootReady(true);
            }
          } catch {}
          waited += step;
        }, step);
      } catch {
        setBootReady(true);
      }
    })();
    if (isTauri) {
      // En Tauri, desregistrar cualquier SW previo para evitar precache/404
      try {
        navigator.serviceWorker
          ?.getRegistrations()
          .then((rs) => Promise.all(rs.map((r) => r.unregister())))
          .catch(() => {});
      } catch {}
      return () => {
        try {
          clearInterval(iv);
        } catch {}
      };
    }
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => console.warn("SW registration failed", err));
    }
    return () => {
      try {
        clearInterval(iv);
      } catch {}
    };
  }, []);

  return (
    <HeroUIProvider navigate={router.push} locale="es-CO">
      <TRPCProvider>
        {bootReady && <AuthGate />}
        {bootReady && <OnboardingGate />}
        <ToastProvider>{children}</ToastProvider>
      </TRPCProvider>
    </HeroUIProvider>
  );
}
