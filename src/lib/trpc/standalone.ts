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
    }),
  ],
});
