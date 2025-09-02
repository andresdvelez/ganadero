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

  // En Tauri (desktop), si la API TRPC se está enrutando al remoto (por falta de token local),
  // no bloqueemos por navigator.onLine. Permitimos consulta aunque estemos online/offline.
  const isTauri = typeof window !== "undefined" && (window as any).__TAURI__;
  // Coerce a boolean estrictamente; evitar undefined que rompe React Query "enabled"
  const enabledCheck =
    !!isLoaded &&
    isSignedIn === true &&
    (isTauri || (typeof navigator !== "undefined" && navigator.onLine));

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

      // En app de escritorio (Tauri), no forzar redirecciones automáticas de onboarding.
      // El flujo de onboarding se inicia solo cuando el usuario navega explícitamente.
      if (isTauri) return;

      // Skip other allowed routes
      if (ALLOW_ROUTES.some((p) => pathname?.startsWith(p))) return;
      if (!isLoaded || !isSignedIn) return;
      if (!isTauri && typeof navigator !== "undefined" && !navigator.onLine)
        return; // offline web: deja a AuthGate

      // Si hubo error al consultar, no forzar onboarding (permitir navegación normal)
      if (error) return;
      // Solo decidir cuando hay datos definidos
      const hasOrg = Array.isArray(orgs) && orgs.length > 0;

      // Only require organization to proceed; passcode/identity is optional
      if (Array.isArray(orgs) && !hasOrg) {
        router.replace("/onboarding");
      }
    })();
  }, [pathname, router, isLoaded, isSignedIn, orgs, error, checking]);

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
