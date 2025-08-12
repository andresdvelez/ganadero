import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const locationsRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { clerkId: ctx.userId },
    });
    if (!user) throw new Error("User not found");
    return ctx.prisma.location.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
  }),
  create: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        type: z.string().nullable().optional(),
        lat: z.number().nullable().optional(),
        lng: z.number().nullable().optional(),
        areaHa: z.number().nullable().optional(),
        notes: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { clerkId: ctx.userId },
      });
      if (!user) throw new Error("User not found");
      return ctx.prisma.location.create({
        data: {
          userId: user.id,
          name: input.name,
          type: input.type || null,
          lat: input.lat ?? null,
          lng: input.lng ?? null,
          areaHa: input.areaHa ?? null,
          notes: input.notes || null,
        },
      });
    }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: z.object({
          name: z.string().nullable().optional(),
          type: z.string().nullable().optional(),
          lat: z.number().nullable().optional(),
          lng: z.number().nullable().optional(),
          areaHa: z.number().nullable().optional(),
          notes: z.string().nullable().optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.location.update({
        where: { id: input.id },
        data: {
          ...(input.data.name !== undefined && input.data.name !== null
            ? { name: input.data.name }
            : {}),
          ...(input.data.type !== undefined
            ? { type: input.data.type ?? null }
            : {}),
          ...(input.data.lat !== undefined
            ? { lat: input.data.lat ?? null }
            : {}),
          ...(input.data.lng !== undefined
            ? { lng: input.data.lng ?? null }
            : {}),
          ...(input.data.areaHa !== undefined
            ? { areaHa: input.data.areaHa ?? null }
            : {}),
          ...(input.data.notes !== undefined
            ? { notes: input.data.notes ?? null }
            : {}),
        },
      });
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.location.delete({ where: { id: input.id } });
      return { ok: true };
    }),
});
