import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const mastitisRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        animalId: z.string(),
        detectedAt: z.string(),
        quarter: z.string().optional(),
        cmtScore: z.string().optional(),
        bacteria: z.string().optional(),
        antibiogram: z.string().optional(),
        labExamId: z.string().optional(),
        treatment: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.mastitisCase.create({
        data: {
          userId: ctx.userId!,
          animalId: input.animalId,
          detectedAt: new Date(input.detectedAt),
          quarter: input.quarter || null,
          cmtScore: input.cmtScore || null,
          bacteria: input.bacteria || null,
          antibiogram: input.antibiogram || null,
          labExamId: input.labExamId || null,
          treatment: input.treatment || null,
          notes: input.notes || null,
        },
      });
    }),
  list: protectedProcedure
    .input(
      z
        .object({
          animalId: z.string().optional(),
          status: z.string().optional(),
          limit: z.number().min(1).max(200).default(100),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const where: any = { userId: ctx.userId! };
      if (input?.animalId) where.animalId = input.animalId;
      if (input?.status) where.status = input.status;
      return ctx.prisma.mastitisCase.findMany({
        where,
        orderBy: { detectedAt: "desc" },
        take: input?.limit ?? 100,
      });
    }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: z.object({
          status: z.string().optional(),
          treatment: z.string().nullable().optional(),
          notes: z.string().nullable().optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.mastitisCase.update({
        where: { id: input.id },
        data: {
          ...(input.data.status !== undefined
            ? { status: input.data.status }
            : {}),
          ...(input.data.treatment !== undefined
            ? { treatment: input.data.treatment }
            : {}),
          ...(input.data.notes !== undefined
            ? { notes: input.data.notes }
            : {}),
        },
      });
    }),
});
