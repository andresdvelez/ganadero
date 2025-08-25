import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const milkRouter = createTRPCRouter({
  list: protectedProcedure
    .input(
      z
        .object({
          animalId: z.string().optional(),
          limit: z.number().min(1).max(100).default(50),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.farmId) {
        throw new Error("Finca activa no seleccionada");
      }
      const where: any = { user: { clerkId: ctx.userId }, farmId: ctx.farmId };
      if (input?.animalId) where.animalId = input.animalId;
      return ctx.prisma.milkRecord.findMany({
        where,
        orderBy: { recordedAt: "desc" },
        take: input?.limit ?? 50,
      });
    }),

  kpis: protectedProcedure
    .input(
      z
        .object({
          from: z.string().optional(),
          to: z.string().optional(),
          top: z.number().min(1).max(50).default(10),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.farmId) {
        throw new Error("Finca activa no seleccionada");
      }
      const where: any = { user: { clerkId: ctx.userId }, farmId: ctx.farmId };
      if (input?.from || input?.to) {
        where.recordedAt = {};
        if (input.from) (where.recordedAt as any).gte = new Date(input.from);
        if (input.to) (where.recordedAt as any).lte = new Date(input.to);
      }
      const rows = await ctx.prisma.milkRecord.findMany({
        where,
        select: { animalId: true, ccs: true, liters: true },
      });
      const map = new Map<string, { sum: number; count: number }>();
      rows.forEach((r) => {
        if (!r.animalId || !r.ccs) return;
        const m = map.get(r.animalId) || { sum: 0, count: 0 };
        m.sum += r.ccs;
        m.count += 1;
        map.set(r.animalId, m);
      });
      const avgs = Array.from(map.entries()).map(([animalId, v]) => ({
        animalId,
        avgCCS: v.sum / Math.max(1, v.count),
      }));
      avgs.sort((a, b) => b.avgCCS - a.avgCCS);
      const top = avgs.slice(0, input?.top ?? 10);
      const animals = await ctx.prisma.animal.findMany({
        where: { id: { in: top.map((t) => t.animalId) }, farmId: ctx.farmId },
        select: { id: true, name: true, tagNumber: true },
      });
      const amap = new Map(animals.map((a) => [a.id, a] as const));
      // Herd average CCS
      const herd = Array.from(map.values());
      const herdAvgCCS = herd.length
        ? herd.reduce((s, v) => s + v.sum / Math.max(1, v.count), 0) /
          herd.length
        : 0;

      // Top animals by liters
      const litersByAnimal = new Map<string, number>();
      rows.forEach((r) => {
        if (!r.animalId) return;
        litersByAnimal.set(
          r.animalId,
          (litersByAnimal.get(r.animalId) || 0) + (r.liters || 0)
        );
      });
      const litersTop = Array.from(litersByAnimal.entries())
        .map(([animalId, liters]) => ({ animalId, liters }))
        .sort((a, b) => b.liters - a.liters)
        .slice(0, input?.top ?? 10);
      const animals2 = await ctx.prisma.animal.findMany({
        where: {
          id: { in: litersTop.map((t) => t.animalId) },
          farmId: ctx.farmId,
        },
        select: { id: true, name: true, tagNumber: true },
      });
      const amap2 = new Map(animals2.map((a) => [a.id, a] as const));

      return {
        topCCS: top.map((t) => ({ ...t, animal: amap.get(t.animalId) })),
        herdAvgCCS,
        topLiters: litersTop.map((t) => ({
          ...t,
          animal: amap2.get(t.animalId),
        })),
      };
    }),

  create: protectedProcedure
    .input(
      z.object({
        animalId: z.string().optional(),
        session: z.enum(["AM", "PM", "TOTAL"]),
        liters: z.number().positive(),
        fatPct: z.number().optional(),
        proteinPct: z.number().optional(),
        ccs: z.number().optional(),
        notes: z.string().optional(),
        recordedAt: z.date(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.farmId) {
        throw new Error("Finca activa no seleccionada");
      }
      const user = await ctx.prisma.user.upsert({
        where: { clerkId: ctx.userId },
        update: {},
        create: {
          clerkId: ctx.userId,
          email: `user_${ctx.userId}@ganado.ai`,
        },
      });
      return ctx.prisma.milkRecord.create({
        data: {
          ...input,
          userId: user.id,
          farmId: ctx.farmId,
        },
      });
    }),
});
