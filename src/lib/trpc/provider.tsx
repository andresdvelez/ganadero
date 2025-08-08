"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, loggerLink } from "@trpc/client";
import { useMemo, useState } from "react";
import { trpc } from "./client";
import superjson from "superjson";

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

  const trpcUrl = useMemo(() => {
    const explicit = process.env.NEXT_PUBLIC_TRPC_URL;
    if (explicit && explicit.length > 0) return explicit;
    if (typeof window !== "undefined" && (window as any).__TAURI__) {
      // Fallback para Tauri si no hay env var pública definida
      return "https://ganadero-nine.vercel.app/api/trpc";
    }
    return "/api/trpc";
  }, []);

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        loggerLink({
          enabled: (opts) =>
            process.env.NODE_ENV === "development" ||
            (opts.direction === "down" && opts.result instanceof Error),
        }),
        httpBatchLink({
          url: trpcUrl,
          transformer: superjson,
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
}
