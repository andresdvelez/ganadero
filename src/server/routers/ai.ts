import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const aiRouter = createTRPCRouter({
  routeIntent: protectedProcedure
    .input(z.object({ query: z.string() }))
    .mutation(async ({ input }) => {
      const q = input.query.toLowerCase();
      // naive rules: expand later with LLM
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
    }),
});
