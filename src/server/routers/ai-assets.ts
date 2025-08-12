import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const aiAssetsRouter = createTRPCRouter({
  // Tanks
  createTank: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        serial: z.string().optional(),
        location: z.string().optional(),
        capacityLiters: z.number().optional(),
        nitrogenLevel: z.number().optional(),
        lastRefillAt: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.aITank.create({
        data: {
          userId: ctx.userId!,
          name: input.name,
          serial: input.serial || null,
          location: input.location || null,
          capacityLiters: input.capacityLiters ?? null,
          nitrogenLevel: input.nitrogenLevel ?? null,
          lastRefillAt: input.lastRefillAt
            ? new Date(input.lastRefillAt)
            : null,
          notes: input.notes || null,
        },
      });
    }),
  listTanks: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.aITank.findMany({
      where: { userId: ctx.userId! },
      orderBy: { createdAt: "desc" },
    });
  }),

  // Semen
  createSemenBatch: protectedProcedure
    .input(
      z.object({
        code: z.string(),
        sireId: z.string().optional(),
        breed: z.string().optional(),
        strawCount: z.number().int().nonnegative().default(0),
        tankId: z.string().optional(),
        canister: z.string().optional(),
        acquiredAt: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.semenBatch.create({
        data: {
          userId: ctx.userId!,
          code: input.code,
          sireId: input.sireId || null,
          breed: input.breed || null,
          strawCount: input.strawCount,
          tankId: input.tankId || null,
          canister: input.canister || null,
          acquiredAt: input.acquiredAt ? new Date(input.acquiredAt) : null,
          notes: input.notes || null,
        },
      });
    }),
  moveSemen: protectedProcedure
    .input(
      z.object({
        semenBatchId: z.string(),
        type: z.enum(["in", "out", "adjust"]),
        quantity: z.number().int(),
        date: z.string(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const movement = await ctx.prisma.semenMovement.create({
        data: {
          userId: ctx.userId!,
          semenBatchId: input.semenBatchId,
          type: input.type,
          quantity: input.quantity,
          date: new Date(input.date),
          reason: input.reason || null,
        },
      });
      // Update strawCount
      const delta = input.type === "out" ? -input.quantity : input.quantity;
      await ctx.prisma.semenBatch.update({
        where: { id: input.semenBatchId },
        data: { strawCount: { increment: delta } },
      });
      return movement;
    }),
  listSemenBatches: protectedProcedure
    .input(
      z
        .object({
          q: z.string().optional(),
          limit: z.number().min(1).max(200).default(100),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const where: any = { userId: ctx.userId! };
      if (input?.q)
        where.OR = [
          { code: { contains: input.q, mode: "insensitive" } },
          { breed: { contains: input.q, mode: "insensitive" } },
        ];
      return ctx.prisma.semenBatch.findMany({
        where,
        orderBy: { code: "asc" },
        take: input?.limit ?? 100,
        include: { tank: true, movements: true, sire: true },
      });
    }),

  // Embryos
  createEmbryoBatch: protectedProcedure
    .input(
      z.object({
        code: z.string(),
        donorId: z.string().optional(),
        sireId: z.string().optional(),
        stage: z.string().optional(),
        strawCount: z.number().int().nonnegative().default(0),
        tankId: z.string().optional(),
        canister: z.string().optional(),
        frozenAt: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.embryoBatch.create({
        data: {
          userId: ctx.userId!,
          code: input.code,
          donorId: input.donorId || null,
          sireId: input.sireId || null,
          stage: input.stage || null,
          strawCount: input.strawCount,
          tankId: input.tankId || null,
          canister: input.canister || null,
          frozenAt: input.frozenAt ? new Date(input.frozenAt) : null,
          notes: input.notes || null,
        },
      });
    }),
  moveEmbryo: protectedProcedure
    .input(
      z.object({
        embryoBatchId: z.string(),
        type: z.enum(["in", "out", "adjust"]),
        quantity: z.number().int(),
        date: z.string(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const movement = await ctx.prisma.embryoMovement.create({
        data: {
          userId: ctx.userId!,
          embryoBatchId: input.embryoBatchId,
          type: input.type,
          quantity: input.quantity,
          date: new Date(input.date),
          reason: input.reason || null,
        },
      });
      const delta = input.type === "out" ? -input.quantity : input.quantity;
      await ctx.prisma.embryoBatch.update({
        where: { id: input.embryoBatchId },
        data: { strawCount: { increment: delta } },
      });
      return movement;
    }),
  listEmbryoBatches: protectedProcedure
    .input(
      z
        .object({
          q: z.string().optional(),
          limit: z.number().min(1).max(200).default(100),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const where: any = { userId: ctx.userId! };
      if (input?.q)
        where.OR = [
          { code: { contains: input.q, mode: "insensitive" } },
          { stage: { contains: input.q, mode: "insensitive" } },
        ];
      return ctx.prisma.embryoBatch.findMany({
        where,
        orderBy: { code: "asc" },
        take: input?.limit ?? 100,
        include: { tank: true, movements: true, donor: true, sire: true },
      });
    }),
});
