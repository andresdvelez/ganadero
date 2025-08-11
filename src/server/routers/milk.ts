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
