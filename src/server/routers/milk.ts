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
      const where: any = { user: { clerkId: ctx.userId } };
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
      const where: any = { user: { clerkId: ctx.userId } };
      if (input?.from || input?.to) {
        where.recordedAt = {};
        if (input.from) (where.recordedAt as any).gte = new Date(input.from);
        if (input.to) (where.recordedAt as any).lte = new Date(input.to);
      }
      const rows = await ctx.prisma.milkRecord.findMany({
        where,
        select: { animalId: true, ccs: true },
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
        where: { id: { in: top.map((t) => t.animalId) } },
        select: { id: true, name: true, tagNumber: true },
      });
      const amap = new Map(animals.map((a) => [a.id, a] as const));
      return top.map((t) => ({ ...t, animal: amap.get(t.animalId) }));
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
        },
      });
    }),
});
