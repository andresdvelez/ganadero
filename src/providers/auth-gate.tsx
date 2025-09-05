"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { hasOfflineIdentity, isUnlocked } from "@/lib/auth/offline-auth";
import { useAuth } from "@clerk/nextjs";

export function AuthGate() {
  const router = useRouter();
  const pathname = usePathname();
  const { isSignedIn, isLoaded } = useAuth();
  const isTauri = typeof window !== "undefined" && (window as any).__TAURI__;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Páginas públicas
      if (
        pathname?.startsWith("/sign-in") ||
        pathname?.startsWith("/sign-up") ||
        pathname?.startsWith("/device-unlock") ||
        pathname?.startsWith("/offline")
      ) {
        // Si Tauri está offline, forzar flujo offline
        if (isTauri && typeof navigator !== "undefined" && !navigator.onLine) {
          if (pathname?.startsWith("/sign-in") || pathname?.startsWith("/sign-up")) {
            router.replace("/offline");
          }
        }
        return;
      }

      // Con Internet (web o Tauri): requerir sesión de Clerk
      if (typeof navigator !== "undefined" && navigator.onLine) {
        if (isLoaded && !isSignedIn) router.replace("/sign-in");
        return;
      }

      // Modo offline: requerir identidad + desbloqueo, o mostrar ayuda offline
      const hasIdentity = await hasOfflineIdentity();
      if (cancelled) return;
      if (hasIdentity) {
        if (!isUnlocked()) router.replace("/device-unlock");
        return;
      }
      // No identity locally: send to offline help
      router.replace("/offline");
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname, router, isLoaded, isSignedIn, isTauri]);

  return null;
}
