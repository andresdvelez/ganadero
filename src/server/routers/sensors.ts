import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const sensorsRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { clerkId: ctx.userId },
    });
    if (!user) throw new Error("User not found");
    return ctx.prisma.sensor.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
  }),
  create: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        type: z.string().nullable().optional(),
        status: z.enum(["active", "inactive"]).nullable().optional(),
        lastReadingAt: z.string().nullable().optional(),
        locationName: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { clerkId: ctx.userId },
      });
      if (!user) throw new Error("User not found");
      return ctx.prisma.sensor.create({
        data: {
          userId: user.id,
          name: input.name,
          type: input.type || null,
          status: input.status || "inactive",
          lastReadingAt: input.lastReadingAt
            ? new Date(input.lastReadingAt)
            : null,
          locationName: input.locationName || null,
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
          status: z.enum(["active", "inactive"]).nullable().optional(),
          lastReadingAt: z.string().nullable().optional(),
          locationName: z.string().nullable().optional(),
          notes: z.string().nullable().optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.sensor.update({
        where: { id: input.id },
        data: {
          ...(input.data.name !== undefined ? { name: input.data.name } : {}),
          ...(input.data.type !== undefined ? { type: input.data.type } : {}),
          ...(input.data.status !== undefined
            ? { status: input.data.status }
            : {}),
          ...(input.data.lastReadingAt !== undefined
            ? {
                lastReadingAt: input.data.lastReadingAt
                  ? new Date(input.data.lastReadingAt)
                  : null,
              }
            : {}),
          ...(input.data.locationName !== undefined
            ? { locationName: input.data.locationName }
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
      await ctx.prisma.sensor.delete({ where: { id: input.id } });
      return { ok: true };
    }),
});
