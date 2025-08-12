import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const healthRouter = createTRPCRouter({
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
      return ctx.prisma.healthRecord.findMany({
        where,
        orderBy: { performedAt: "desc" },
        take: input?.limit ?? 50,
      });
    }),

  kpis: protectedProcedure
    .input(
      z
        .object({ from: z.string().optional(), to: z.string().optional() })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const where: any = { user: { clerkId: ctx.userId } };
      if (input?.from || input?.to) {
        where.performedAt = {};
        if (input.from) (where.performedAt as any).gte = new Date(input.from);
        if (input.to) (where.performedAt as any).lte = new Date(input.to);
      }
      const rows = await ctx.prisma.healthRecord.findMany({
        where,
        select: { type: true, cost: true, performedAt: true },
      });
      const byMonthType = new Map<string, number>();
      rows.forEach((r) => {
        const d = new Date(r.performedAt);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
          2,
          "0"
        )}-${r.type || "Otro"}`;
        byMonthType.set(key, (byMonthType.get(key) || 0) + (r.cost || 0));
      });
      const series = Array.from(byMonthType.entries()).map(([k, v]) => {
        const [ym, type] = [k.slice(0, 7), k.slice(8)];
        return { period: ym, type, cost: v };
      });
      return { series };
    }),

  create: protectedProcedure
    .input(
      z.object({
        animalId: z.string(),
        type: z.string(),
        description: z.string().min(1),
        medication: z.string().optional(),
        dosage: z.string().optional(),
        veterinarian: z.string().optional(),
        cost: z.number().optional(),
        notes: z.string().optional(),
        performedAt: z.date(),
        nextDueDate: z.date().optional(),
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
      return ctx.prisma.healthRecord.create({
        data: {
          ...input,
          userId: user.id,
        },
      });
    }),
});
