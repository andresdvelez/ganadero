"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { hasOfflineIdentity, isUnlocked } from "@/lib/auth/offline-auth";
import { useAuth } from "@clerk/nextjs";

export function AuthGate() {
  const router = useRouter();
  const pathname = usePathname();
  const { isSignedIn, isLoaded } = useAuth();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Allow public auth pages
      if (
        pathname?.startsWith("/sign-in") ||
        pathname?.startsWith("/sign-up") ||
        pathname?.startsWith("/_/device-unlock") ||
        pathname?.startsWith("/_/offline")
      ) {
        return;
      }

      if (typeof navigator !== "undefined" && navigator.onLine) {
        // Online: require Clerk session
        if (isLoaded && !isSignedIn) {
          router.replace("/sign-in");
        }
        return;
      }

      // Offline: require identity + unlock, or show offline help
      const hasIdentity = await hasOfflineIdentity();
      if (cancelled) return;
      if (hasIdentity) {
        if (!isUnlocked()) router.replace("/_/device-unlock");
        return;
      }
      // No identity locally: send to offline help
      router.replace("/_/offline");
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname, router, isLoaded, isSignedIn]);

  return null;
}
