"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, loggerLink } from "@trpc/client";
import { useEffect, useMemo, useState } from "react";
import { trpc } from "./client";
import superjson from "superjson";
import { useAuth } from "@clerk/nextjs";

async function probe(url: string, timeoutMs = 1200): Promise<boolean> {
  try {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), timeoutMs);
    const res = await fetch(url, { method: "HEAD", signal: c.signal });
    clearTimeout(t);
    return !!res.ok || res.status === 405 || res.status === 404;
  } catch {
    return false;
  }
}

export function TRPCProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  const explicit = process.env.NEXT_PUBLIC_TRPC_URL;
  const baseDefault = "/api/trpc";
  const remoteFallback = "https://app.ganado.co/api/trpc";

  const [resolvedUrl, setResolvedUrl] = useState<string>(
    explicit && explicit.length > 0 ? explicit : baseDefault
  );

  const { getToken } = useAuth();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (explicit && explicit.length > 0) return; // respect explicit config
      const isTauri =
        typeof window !== "undefined" && (window as any).__TAURI__;
      if (isTauri) {
        const localUrl = "http://127.0.0.1:4317/api/trpc";
        // Preferir servidor local embebido si está listo; evitar CORS con remoto
        const localReady = await probe("http://127.0.0.1:4317/manifest.webmanifest", 1800);
        if (localReady) {
          if (!cancelled) setResolvedUrl(localUrl);
          return;
        }
        const remoteReady = await probe("https://app.ganado.co/manifest.webmanifest", 1200);
        if (remoteReady) {
          if (!cancelled) setResolvedUrl(remoteFallback);
          return;
        }
        // Si ninguno responde aún, intenta local por defecto (el server suele tardar en iniciar)
        if (!cancelled) setResolvedUrl(localUrl);
        return;
      }
      // Web: keep relative so it works on Vercel and dev
      if (!cancelled) setResolvedUrl(baseDefault);
    })();
    return () => {
      cancelled = true;
    };
  }, [explicit, getToken]);

  const trpcClient = useMemo(
    () =>
      trpc.createClient({
        links: [
          loggerLink({
            enabled: (opts) =>
              process.env.NODE_ENV === "development" ||
              (opts.direction === "down" && opts.result instanceof Error),
          }),
          httpBatchLink({
            url: resolvedUrl,
            transformer: superjson,
            async fetch(url, opts) {
              let token: string | null = null;
              try {
                token = await getToken();
              } catch {
                token = null;
              }
              const headers = new Headers(opts?.headers);
              if (token) {
                headers.set("authorization", `Bearer ${token}`);
              }
              try {
                const farmId = window.localStorage.getItem("ACTIVE_FARM_ID");
                if (farmId) headers.set("x-farm-id", farmId);
              } catch {}
              return fetch(url, { ...opts, credentials: "include", headers });
            },
          }),
        ],
      }),
    [resolvedUrl, getToken]
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
