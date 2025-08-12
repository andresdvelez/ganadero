import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const financeRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { clerkId: ctx.userId },
    });
    if (!user) throw new Error("User not found");
    return ctx.prisma.financeTransaction.findMany({
      where: { userId: user.id },
      orderBy: { date: "desc" },
    });
  }),

  kpis: protectedProcedure
    .input(
      z
        .object({ from: z.string().optional(), to: z.string().optional() })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { clerkId: ctx.userId },
      });
      if (!user) throw new Error("User not found");
      const where: any = { userId: user.id };
      if (input?.from || input?.to) {
        where.date = {};
        if (input.from) (where.date as any).gte = new Date(input.from);
        if (input.to) (where.date as any).lte = new Date(input.to);
      }
      const txs = await ctx.prisma.financeTransaction.findMany({
        where,
        select: { type: true, category: true, amount: true },
      });
      let income = 0;
      let expense = 0;
      const byCat = new Map<string, { income: number; expense: number }>();
      txs.forEach((t) => {
        if (t.type === "income") income += t.amount || 0;
        else expense += t.amount || 0;
        const key = t.category || "Sin categoría";
        const agg = byCat.get(key) || { income: 0, expense: 0 };
        if (t.type === "income") agg.income += t.amount || 0;
        else agg.expense += t.amount || 0;
        byCat.set(key, agg);
      });
      const byCategory = Array.from(byCat.entries()).map(([label, v]) => ({
        label,
        income: v.income,
        expense: v.expense,
        margin: v.income - v.expense,
      }));
      return { income, expense, margin: income - expense, byCategory };
    }),

  create: protectedProcedure
    .input(
      z.object({
        type: z.enum(["income", "expense"]),
        category: z.string().nullable().optional(),
        amount: z.number(),
        currency: z.string().nullable().optional(),
        date: z.string(),
        counterparty: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { clerkId: ctx.userId },
      });
      if (!user) throw new Error("User not found");
      return ctx.prisma.financeTransaction.create({
        data: {
          userId: user.id,
          type: input.type,
          category: input.category || null,
          amount: input.amount,
          currency: input.currency || "COP",
          date: new Date(input.date),
          counterparty: input.counterparty || null,
          notes: input.notes || null,
        },
      });
    }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: z.object({
          type: z.enum(["income", "expense"]).nullable().optional(),
          category: z.string().nullable().optional(),
          amount: z.number().nullable().optional(),
          currency: z.string().nullable().optional(),
          date: z.string().nullable().optional(),
          counterparty: z.string().nullable().optional(),
          notes: z.string().nullable().optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.financeTransaction.update({
        where: { id: input.id },
        data: {
          ...(input.data.type ? { type: input.data.type } : {}),
          ...(input.data.category !== undefined
            ? { category: input.data.category }
            : {}),
          ...(input.data.amount !== undefined
            ? { amount: input.data.amount! }
            : {}),
          ...(input.data.currency !== undefined
            ? { currency: input.data.currency }
            : {}),
          ...(input.data.date !== undefined
            ? input.data.date
              ? { date: new Date(input.data.date) }
              : {}
            : {}),
          ...(input.data.counterparty !== undefined
            ? { counterparty: input.data.counterparty }
            : {}),
          ...(input.data.notes !== undefined
            ? { notes: input.data.notes }
            : {}),
        },
      });
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.financeTransaction.delete({ where: { id: input.id } });
      return { ok: true };
    }),
});
