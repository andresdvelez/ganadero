import { createTRPCProxyClient, httpBatchLink, loggerLink } from "@trpc/client";
import type { AppRouter } from "@/server/routers/app";
import superjson from "superjson";

export const trpcClient = createTRPCProxyClient<AppRouter>({
  links: [
    loggerLink({
      enabled: (opts) =>
        process.env.NODE_ENV === "development" ||
        (opts.direction === "down" && opts.result instanceof Error),
    }),
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      async fetch(url, opts) {
        // try to get Clerk token in browser
        let token: string | null = null;
        try {
          // dynamic import to avoid SSR issues
          const mod = await import("@clerk/nextjs");
          const { getToken } = (mod as any).auth?.() || {};
          if (typeof getToken === "function") {
            token = await getToken();
          }
        } catch {}
        const headers = new Headers(opts?.headers);
        if (token) headers.set("authorization", `Bearer ${token}`);
        return fetch(url, { ...opts, credentials: "include", headers });
      },
    }),
  ],
});
