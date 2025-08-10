"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, loggerLink } from "@trpc/client";
import { useEffect, useMemo, useState } from "react";
import { trpc } from "./client";
import superjson from "superjson";

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
  const remoteFallback = "https://ganadero-nine.vercel.app/api/trpc";

  const [resolvedUrl, setResolvedUrl] = useState<string>(
    explicit && explicit.length > 0 ? explicit : baseDefault
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (explicit && explicit.length > 0) return; // respect explicit config
      const isTauri =
        typeof window !== "undefined" && (window as any).__TAURI__;
      if (isTauri) {
        const localUrl = "http://127.0.0.1:4317/api/trpc";
        if (await probe("http://127.0.0.1:4317/manifest.webmanifest")) {
          if (!cancelled) setResolvedUrl(localUrl);
          return;
        }
        // If local server not up yet, fall back to remote API to keep UI usable
        if (!cancelled) setResolvedUrl(remoteFallback);
        return;
      }
      // Web: keep relative so it works on Vercel and dev
      if (!cancelled) setResolvedUrl(baseDefault);
    })();
    return () => {
      cancelled = true;
    };
  }, [explicit]);

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
          }),
        ],
      }),
    [resolvedUrl]
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
