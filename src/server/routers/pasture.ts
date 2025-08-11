import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const pastureRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.upsert({
      where: { clerkId: ctx.userId },
      update: {},
      create: { clerkId: ctx.userId, email: `user_${ctx.userId}@ganado.ai` },
    });
    const pastures = await ctx.prisma.pasture.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
    return pastures;
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        areaHa: z.number().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.upsert({
        where: { clerkId: ctx.userId },
        update: {},
        create: { clerkId: ctx.userId, email: `user_${ctx.userId}@ganado.ai` },
      });
      return await ctx.prisma.pasture.create({
        data: {
          userId: user.id,
          name: input.name,
          areaHa: input.areaHa,
          notes: input.notes,
        },
      });
    }),
});
