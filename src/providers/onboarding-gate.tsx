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
  const { isSignedIn, isLoaded, userId } = useAuth();

  // En Tauri (desktop), si la API TRPC se está enrutando al remoto (por falta de token local),
  // no bloqueemos por navigator.onLine. Permitimos consulta aunque estemos online/offline.
  const isTauri =
    typeof window !== "undefined" && Boolean((window as any).__TAURI__);
  // Coerce boolean estricto
  const enabledCheck = Boolean(
    isLoaded &&
      isSignedIn === true &&
      (isTauri || (typeof navigator !== "undefined" && navigator.onLine))
  );

  const {
    data: orgs,
    error,
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
      if (!isTauri && typeof navigator !== "undefined" && !navigator.onLine)
        return; // offline web: deja a AuthGate

      // Determinar si la cuenta ya tiene organización
      const hasOrg = Array.isArray(orgs) && orgs.length > 0;

      // Si hay error de consulta o no hay orgs, redirigir SIEMPRE a onboarding
      // (obligatorio completar onboarding para acceder a la plataforma)
      if ((!hasOrg || error) && pathname !== "/onboarding") {
        router.replace("/onboarding");
      }
    })();
  }, [pathname, router, isLoaded, isSignedIn, userId, orgs, error, checking]);

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
