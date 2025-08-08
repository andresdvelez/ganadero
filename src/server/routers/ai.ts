import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { getAIClient } from "@/services/ai/ollama-client";
import { moduleRegistry } from "@/modules";

export const aiRouter = createTRPCRouter({
  checkLocalModel: protectedProcedure.mutation(async () => {
    const ollamaHost = process.env.NEXT_PUBLIC_OLLAMA_HOST || "";
    const deployBase =
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.APP_BASE_URL ||
      "https://ganadero-nine.vercel.app";
    try {
      const url = ollamaHost
        ? `${ollamaHost}/api/tags`
        : `${deployBase}/api/ollama/api/tags`;
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
  ensureLocalModel: protectedProcedure
    .input(z.object({ model: z.string().default("deepseek-r1:latest") }))
    .mutation(async ({ input }) => {
      const ollamaHost = process.env.NEXT_PUBLIC_OLLAMA_HOST || "";
      const deployBase =
        process.env.NEXT_PUBLIC_BASE_URL ||
        process.env.APP_BASE_URL ||
        "https://ganadero-nine.vercel.app";
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1000 * 60 * 10); // 10m
      try {
        const url = ollamaHost
          ? `${ollamaHost}/api/pull`
          : `${deployBase}/api/ollama/api/pull`;
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
    .mutation(async ({ input }) => {
      // Preguntas sobre módulos disponibles
      const ql = input.query.toLowerCase();
      // Búsqueda simple de productos por nombre/código
      if (
        ql.includes("buscar") &&
        (ql.includes("producto") || ql.includes("invent"))
      ) {
        const after =
          ql.split("producto")[1]?.trim() ||
          ql.split("invent")[1]?.trim() ||
          "";
        const token = encodeURIComponent(after);
        return {
          module: "inventory",
          action: "list",
          navigateTo: `/inventory?q=${token}`,
        } as any;
      }
      // Búsqueda/edición/eliminación por nombre/tag para animales
      if (
        (ql.includes("buscar") ||
          ql.includes("editar") ||
          ql.includes("eliminar")) &&
        ql.includes("animal")
      ) {
        const after = ql.split("animal")[1]?.trim() || "";
        const token = encodeURIComponent(after);
        return {
          module: "animals",
          action: "list",
          navigateTo: `/animals?q=${token}`,
        } as any;
      }
      // Leche
      if (
        (ql.includes("buscar") ||
          ql.includes("editar") ||
          ql.includes("eliminar")) &&
        (ql.includes("leche") || ql.includes("control"))
      ) {
        const after =
          ql.split("leche")[1]?.trim() || ql.split("control")[1]?.trim() || "";
        const token = encodeURIComponent(after);
        return {
          module: "milk",
          action: "list",
          navigateTo: `/milk?q=${token}`,
        } as any;
      }
      // Potreros
      if (
        (ql.includes("buscar") ||
          ql.includes("editar") ||
          ql.includes("eliminar")) &&
        ql.includes("potrero")
      ) {
        const after = ql.split("potrero")[1]?.trim() || "";
        const token = encodeURIComponent(after);
        return {
          module: "pastures",
          action: "list",
          navigateTo: `/pastures?q=${token}`,
        } as any;
      }
      // Laboratorio
      if (
        (ql.includes("buscar") ||
          ql.includes("editar") ||
          ql.includes("eliminar")) &&
        (ql.includes("lab") || ql.includes("examen"))
      ) {
        const after =
          ql.split("examen")[1]?.trim() || ql.split("lab")[1]?.trim() || "";
        const token = encodeURIComponent(after);
        return {
          module: "lab",
          action: "list",
          navigateTo: `/lab?q=${token}`,
        } as any;
      }
      if (
        ql.includes("modulo") ||
        ql.includes("módulo") ||
        ql.includes("modulos") ||
        ql.includes("módulos") ||
        ql.includes("que puedes hacer") ||
        ql.includes("qué puedes hacer")
      ) {
        const modules = Object.values(moduleRegistry).map((m) => ({
          id: m.id,
          name: m.name,
          hasList: Boolean(m.actions?.list),
          hasCreate: Boolean(m.actions?.create),
        }));
        return {
          module: "assistant",
          action: "list_modules",
          navigateTo: undefined,
          data: { modules },
        } as any;
      }
      const client = getAIClient();
      try {
        const routed = await client.routeToModule(input.query);
        const module = routed.module;
        let navigateTo: string | undefined;
        const base = module ? `/${module}` : undefined;
        if (base) {
          if (routed.action === "list") navigateTo = base;
          else if (routed.action === "create") navigateTo = `${base}/new`;
        }
        return {
          module,
          action: routed.action,
          navigateTo,
          data: routed.params,
        };
      } catch {
        const q = input.query.toLowerCase();
        if (q.includes("vacuna") || q.includes("salud"))
          return {
            module: "health",
            action: "create",
            navigateTo: "/health/new",
          };
        if (q.includes("repro") || q.includes("insemin"))
          return {
            module: "breeding",
            action: "create",
            navigateTo: "/breeding/new",
          };
        if (q.includes("leche") || q.includes("control"))
          return { module: "milk", action: "create", navigateTo: "/milk/new" };
        if (q.includes("invent") || q.includes("producto"))
          return {
            module: "inventory",
            action: "create",
            navigateTo: "/inventory/new",
          };
        if (q.includes("potrero"))
          return {
            module: "pastures",
            action: "create",
            navigateTo: "/pastures/new",
          };
        if (q.includes("lab") || q.includes("examen"))
          return { module: "lab", action: "create", navigateTo: "/lab/new" };
        if (q.includes("animal"))
          return {
            module: "animals",
            action: "create",
            navigateTo: "/animals/new",
          };
        return { module: null, action: null };
      }
    }),
});
