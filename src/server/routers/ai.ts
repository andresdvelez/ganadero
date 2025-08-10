import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";
import { getAIClient } from "@/services/ai/ollama-client";
import { moduleRegistry } from "@/modules";

export const aiRouter = createTRPCRouter({
  checkLocalModel: publicProcedure.mutation(async () => {
    // Always check a local/explicit Ollama server; never fallback to remote deploy base
    const base =
      process.env.NEXT_PUBLIC_OLLAMA_HOST ||
      process.env.OLLAMA_SERVER_URL ||
      "http://127.0.0.1:11434";
    try {
      const url = `${base.replace(/\/$/, "")}/api/tags`;
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return { available: false };
      const data = (await res.json()) as any;
      const hasModel = (data?.models || []).some((m: any) =>
        m?.name?.startsWith("deepseek-r1")
      );
      return { available: hasModel };
    } catch {
      return { available: false };
    }
  }),

  ensureLocalModel: publicProcedure
    .input(z.object({ model: z.string().default("deepseek-r1:latest") }))
    .mutation(async ({ input }) => {
      // Always pull from local/explicit Ollama, not remote deploy base
      const base =
        process.env.NEXT_PUBLIC_OLLAMA_HOST ||
        process.env.OLLAMA_SERVER_URL ||
        "http://127.0.0.1:11434";
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1000 * 60 * 10); // 10m
      try {
        const url = `${base.replace(/\/$/, "")}/api/pull`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ model: input.model, stream: false }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!res.ok)
          throw new Error("No fue posible descargar el modelo local");
        return { ok: true };
      } catch (e: any) {
        clearTimeout(timeout);
        return { ok: false, error: e?.message ?? String(e) };
      }
    }),

  routeIntent: protectedProcedure
    .input(z.object({ query: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const ai = getAIClient();
      // Por ahora, extra: responder módulo dashboard por defecto
      const content = `{"content":"${input.query}","module":"dashboard","action":"none","data":{}}`;
      return { content, module: "dashboard", action: "none" } as any;
    }),
});
