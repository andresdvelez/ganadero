import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const inventoryRouter = createTRPCRouter({
  listProducts: protectedProcedure
    .input(
      z
        .object({
          q: z.string().optional(),
          limit: z.number().min(1).max(200).default(100),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const where: any = { user: { clerkId: ctx.userId } };
      if (input?.q) {
        where.OR = [
          { name: { contains: input.q, mode: "insensitive" } },
          { code: { contains: input.q, mode: "insensitive" } },
        ];
      }
      return ctx.prisma.product.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: input?.limit ?? 100,
      });
    }),

  createProduct: protectedProcedure
    .input(
      z.object({
        code: z.string().min(1),
        name: z.string().min(1),
        unit: z.string().min(1),
        category: z.string().optional(),
        minStock: z.number().optional(),
        cost: z.number().optional(),
        supplier: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.upsert({
        where: { clerkId: ctx.userId },
        update: {},
        create: { clerkId: ctx.userId, email: `user_${ctx.userId}@ganado.ai` },
      });
      return ctx.prisma.product.create({ data: { ...input, userId: user.id } });
    }),

  listMovements: protectedProcedure
    .input(
      z
        .object({
          productId: z.string().optional(),
          limit: z.number().min(1).max(200).default(100),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const where: any = { user: { clerkId: ctx.userId } };
      if (input?.productId) where.productId = input.productId;
      return ctx.prisma.stockMovement.findMany({
        where,
        orderBy: { occurredAt: "desc" },
        take: input?.limit ?? 100,
      });
    }),

  createMovement: protectedProcedure
    .input(
      z.object({
        productId: z.string(),
        type: z.enum(["in", "out", "adjust"]),
        quantity: z.number().positive(),
        unitCost: z.number().optional(),
        reason: z.string().optional(),
        relatedEntity: z.string().optional(),
        occurredAt: z.date(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.upsert({
        where: { clerkId: ctx.userId },
        update: {},
        create: { clerkId: ctx.userId, email: `user_${ctx.userId}@ganado.ai` },
      });
      return ctx.prisma.stockMovement.create({
        data: { ...input, userId: user.id },
      });
    }),
});
