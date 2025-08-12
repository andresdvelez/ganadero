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
            ? (input.data.date ? { date: new Date(input.data.date) } : {})
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
