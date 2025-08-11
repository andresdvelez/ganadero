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
