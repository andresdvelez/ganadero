import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const tasksRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.prisma.user.findUnique({
      where: { clerkId: ctx.userId },
    });
    if (!user) throw new Error("User not found");
    return ctx.prisma.task.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });
  }),
  create: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        description: z.string().nullable().optional(),
        status: z.enum(["open", "in_progress", "done"]).default("open"),
        priority: z.enum(["low", "medium", "high"]).nullable().optional(),
        dueDate: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { clerkId: ctx.userId },
      });
      if (!user) throw new Error("User not found");
      return ctx.prisma.task.create({
        data: {
          userId: user.id,
          title: input.title,
          description: input.description || null,
          status: input.status,
          priority: input.priority || null,
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
        },
      });
    }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: z.object({
          title: z.string().nullable().optional(),
          description: z.string().nullable().optional(),
          status: z.enum(["open", "in_progress", "done"]).nullable().optional(),
          priority: z.enum(["low", "medium", "high"]).nullable().optional(),
          dueDate: z.string().nullable().optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.task.update({
        where: { id: input.id },
        data: {
          ...(input.data.title !== undefined && input.data.title !== null
            ? { title: input.data.title }
            : {}),
          ...(input.data.description !== undefined ? { description: input.data.description ?? null } : {}),
          ...(input.data.status !== undefined
            ? { status: input.data.status }
            : {}),
          ...(input.data.priority !== undefined
            ? { priority: input.data.priority }
            : {}),
          ...(input.data.dueDate !== undefined
            ? {
                dueDate: input.data.dueDate
                  ? new Date(input.data.dueDate)
                  : null,
              }
            : {}),
        },
      });
    }),
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.task.delete({ where: { id: input.id } });
      return { ok: true };
    }),
});
