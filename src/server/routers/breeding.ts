import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const breedingAdvRouter = createTRPCRouter({
  // Synchronization batches
  createSyncBatch: protectedProcedure
    .input(
      z.object({
        protocol: z.string().optional(),
        startDate: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.breedingSyncBatch.create({
        data: {
          userId: ctx.userId!,
          protocol: input.protocol || null,
          startDate: new Date(input.startDate),
          notes: input.notes || null,
        },
      });
    }),
  listSyncBatches: protectedProcedure
    .input(
      z.object({ limit: z.number().min(1).max(200).default(50) }).optional()
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.breedingSyncBatch.findMany({
        where: { userId: ctx.userId! },
        orderBy: { startDate: "desc" },
        take: input?.limit ?? 50,
        include: { animals: true },
      });
    }),
  addAnimalToBatch: protectedProcedure
    .input(
      z.object({
        batchId: z.string(),
        animalId: z.string(),
        status: z.string().optional(),
        date: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.breedingSyncAnimal.create({
        data: {
          batchId: input.batchId,
          animalId: input.animalId,
          status: input.status || null,
          date: input.date ? new Date(input.date) : null,
          notes: input.notes || null,
        },
      });
    }),
  updateSyncAnimal: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.string().nullable().optional(),
        date: z.string().nullable().optional(),
        notes: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.breedingSyncAnimal.update({
        where: { id: input.id },
        data: {
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.date !== undefined
            ? input.date
              ? { date: new Date(input.date) }
              : { date: null }
            : {}),
          ...(input.notes !== undefined ? { notes: input.notes } : {}),
        },
      });
    }),

  // Palpations
  createPalpation: protectedProcedure
    .input(
      z.object({
        animalId: z.string(),
        palpationDate: z.string(),
        result: z.enum(["pregnant", "open", "unknown"]),
        technician: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.palpationRecord.create({
        data: {
          userId: ctx.userId!,
          animalId: input.animalId,
          palpationDate: new Date(input.palpationDate),
          result: input.result,
          technician: input.technician || null,
          notes: input.notes || null,
        },
      });
    }),
  listPalpations: protectedProcedure
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
      return ctx.prisma.palpationRecord.findMany({
        where,
        orderBy: { palpationDate: "desc" },
        take: input?.limit ?? 100,
      });
    }),

  // Abortions
  createAbortion: protectedProcedure
    .input(
      z.object({
        animalId: z.string(),
        date: z.string(),
        cause: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.abortionRecord.create({
        data: {
          userId: ctx.userId!,
          animalId: input.animalId,
          date: new Date(input.date),
          cause: input.cause || null,
          notes: input.notes || null,
        },
      });
    }),
  listAbortions: protectedProcedure
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
      return ctx.prisma.abortionRecord.findMany({
        where,
        orderBy: { date: "desc" },
        take: input?.limit ?? 100,
      });
    }),
});
