import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const pasturesAdvRouter = createTRPCRouter({
  createEvent: protectedProcedure
    .input(
      z.object({
        pastureId: z.string(),
        type: z.enum(["enter", "leave", "rest"]),
        date: z.string(),
        groupName: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.pastureEvent.create({
        data: {
          userId: ctx.userId!,
          pastureId: input.pastureId,
          type: input.type,
          date: new Date(input.date),
          groupName: input.groupName || null,
          notes: input.notes || null,
        },
      });
    }),
  listEvents: protectedProcedure
    .input(
      z
        .object({
          pastureId: z.string().optional(),
          limit: z.number().min(1).max(200).default(100),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const where: any = { userId: ctx.userId! };
      if (input?.pastureId) where.pastureId = input.pastureId;
      return ctx.prisma.pastureEvent.findMany({
        where,
        orderBy: { date: "desc" },
        take: input?.limit ?? 100,
      });
    }),
  createMeasurement: protectedProcedure
    .input(
      z.object({
        pastureId: z.string(),
        date: z.string(),
        forageKgDMHa: z.number().optional(),
        restDays: z.number().optional(),
        growthRate: z.number().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.pastureMeasurement.create({
        data: {
          userId: ctx.userId!,
          pastureId: input.pastureId,
          date: new Date(input.date),
          forageKgDMHa: input.forageKgDMHa ?? null,
          restDays: input.restDays ?? null,
          growthRate: input.growthRate ?? null,
          notes: input.notes || null,
        },
      });
    }),
  listMeasurements: protectedProcedure
    .input(
      z
        .object({
          pastureId: z.string().optional(),
          limit: z.number().min(1).max(200).default(100),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const where: any = { userId: ctx.userId! };
      if (input?.pastureId) where.pastureId = input.pastureId;
      return ctx.prisma.pastureMeasurement.findMany({
        where,
        orderBy: { date: "desc" },
        take: input?.limit ?? 100,
      });
    }),
});
