import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const weightsRouter = createTRPCRouter({
  createWeight: protectedProcedure
    .input(
      z.object({
        animalId: z.string(),
        weighedAt: z.string(),
        weightKg: z.number(),
        method: z.string().optional(),
        source: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.weightRecord.create({
        data: {
          userId: ctx.userId!,
          animalId: input.animalId,
          weighedAt: new Date(input.weighedAt),
          weightKg: input.weightKg,
          method: input.method || null,
          source: input.source || null,
          notes: input.notes || null,
        },
      });
    }),
  listWeights: protectedProcedure
    .input(
      z
        .object({
          animalId: z.string().optional(),
          limit: z.number().min(1).max(200).default(100),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const where: any = { userId: ctx.userId! };
      if (input?.animalId) where.animalId = input.animalId;
      return ctx.prisma.weightRecord.findMany({
        where,
        orderBy: { weighedAt: "desc" },
        take: input?.limit ?? 100,
      });
    }),
  createCarcass: protectedProcedure
    .input(
      z.object({
        animalId: z.string(),
        date: z.string(),
        hotCarcassKg: z.number().optional(),
        coldCarcassKg: z.number().optional(),
        dressingPct: z.number().optional(),
        grade: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.carcassData.create({
        data: {
          userId: ctx.userId!,
          animalId: input.animalId,
          date: new Date(input.date),
          hotCarcassKg: input.hotCarcassKg ?? null,
          coldCarcassKg: input.coldCarcassKg ?? null,
          dressingPct: input.dressingPct ?? null,
          grade: input.grade || null,
          notes: input.notes || null,
        },
      });
    }),
  listCarcass: protectedProcedure
    .input(
      z
        .object({
          animalId: z.string().optional(),
          limit: z.number().min(1).max(200).default(100),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const where: any = { userId: ctx.userId! };
      if (input?.animalId) where.animalId = input.animalId;
      return ctx.prisma.carcassData.findMany({
        where,
        orderBy: { date: "desc" },
        take: input?.limit ?? 100,
      });
    }),
});
