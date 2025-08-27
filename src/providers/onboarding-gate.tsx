"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { trpc } from "@/lib/trpc/client";
import { hasOfflineIdentity } from "@/lib/auth/offline-auth";

const ALLOW_ROUTES = [
  "/sign-in",
  "/sign-up",
  // Note: do not skip onboarding here so we can redirect away when complete
  "/device-unlock",
  "/offline",
  "/download",
];

export function OnboardingGate() {
  const router = useRouter();
  const pathname = usePathname();
  const { isSignedIn, isLoaded } = useAuth();

  const enabledCheck =
    isLoaded &&
    isSignedIn === true &&
    typeof navigator !== "undefined" &&
    navigator.onLine;

  const {
    data: orgs,
    isLoading,
    isFetching,
  } = trpc.org.myOrganizations.useQuery(undefined, {
    enabled: enabledCheck,
  });

  const checking =
    enabledCheck && (isLoading || isFetching) && pathname !== undefined;

  useEffect(() => {
    (async () => {
      // Do not redirect while validating
      if (checking) return;

      // Handle onboarding page specifically: do NOT redirect automatically on org presence
      if (pathname === "/onboarding") {
        return;
      }

      // Skip other allowed routes
      if (ALLOW_ROUTES.some((p) => pathname?.startsWith(p))) return;
      if (!isLoaded || !isSignedIn) return;
      if (typeof navigator !== "undefined" && !navigator.onLine) return; // offline: let AuthGate handle

      const hasOrg = !!orgs && orgs.length > 0;

      // Only require organization to proceed; passcode/identity is optional
      if (!hasOrg) {
        router.replace("/onboarding");
      }
    })();
  }, [pathname, router, isLoaded, isSignedIn, orgs, checking]);

  // Visual loading guard while validating to avoid route flashes
  if (checking) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-white/70 backdrop-blur-sm">
        <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 shadow-sm text-neutral-700">
          Validando tu acceso…
        </div>
      </div>
    );
  }

  return null;
}
