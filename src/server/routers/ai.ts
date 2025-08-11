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

  checkCloudAvailable: publicProcedure.query(async () => {
    const hasKey = !!process.env.OPENROUTER_API_KEY;
    return { available: hasKey };
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
      const q = input.query
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "");

      // Simple Spanish synonyms
      const isAnimalContext =
        /\banimal(es)?\b|\bvaca\b|\bternero\b|\btoro\b|\bganado\b/.test(q);
      const wantsCreate =
        /\b(agregar|registrar|crear|anadir|nuevo|cargar)\b/.test(q) ||
        /\b(nuevo\s+animal)\b/.test(q);
      const wantsList = /\b(ver|listar|mostrar)\b/.test(q);

      if (isAnimalContext && wantsCreate) {
        return { module: "animals", action: "create", data: {} } as any;
      }
      if (isAnimalContext && wantsList) {
        return { module: "animals", action: "list", data: {} } as any;
      }

      // Health placeholders
      const isHealth = /salud|vacuna|tratamiento|enfermedad/.test(q);
      if (isHealth && wantsCreate) {
        return { module: "health", action: "create", data: {} } as any;
      }
      if (isHealth && wantsList) {
        return { module: "health", action: "list", data: {} } as any;
      }

      // Default: no action
      return { module: "dashboard", action: "none", data: {} } as any;
    }),
});
