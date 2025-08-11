"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { trpc } from "@/lib/trpc/client";
import { hasOfflineIdentity } from "@/lib/auth/offline-auth";

const ALLOW_ROUTES = [
  "/sign-in",
  "/sign-up",
  "/onboarding",
  "/_/device-unlock",
  "/_/offline",
  "/_/download",
  "/device-unlock",
  "/offline",
  "/download",
];

export function OnboardingGate() {
  const router = useRouter();
  const pathname = usePathname();
  const { isSignedIn, isLoaded } = useAuth();
  const { data: orgs } = trpc.org.myOrganizations.useQuery(undefined, {
    enabled:
      isLoaded &&
      isSignedIn === true &&
      typeof navigator !== "undefined" &&
      navigator.onLine,
  });

  useEffect(() => {
    (async () => {
      // Skip allowed routes
      if (ALLOW_ROUTES.some((p) => pathname?.startsWith(p))) return;
      if (!isLoaded || !isSignedIn) return;
      if (typeof navigator !== "undefined" && !navigator.onLine) return; // offline: let AuthGate handle

      const hasOrg = !!orgs && orgs.length > 0;
      const hasPasscode = await hasOfflineIdentity();

      if ((!hasOrg || !hasPasscode) && pathname !== "/onboarding") {
        router.replace("/onboarding");
      }
    })();
  }, [pathname, router, isLoaded, isSignedIn, orgs]);

  return null;
}
