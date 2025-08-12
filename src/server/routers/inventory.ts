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

  kpis: protectedProcedure
    .input(
      z
        .object({
          from: z.string().optional(),
          to: z.string().optional(),
          topLow: z.number().min(1).max(50).default(10),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { clerkId: ctx.userId },
      });
      if (!user) throw new Error("User not found");
      // Low stock: products with minStock and currentStock below threshold (approx via movements)
      const products = await ctx.prisma.product.findMany({
        where: { userId: user.id },
        select: { id: true, name: true, code: true, minStock: true },
      });
      const pmap = new Map(products.map((p) => [p.id, p] as const));
      const moves = await ctx.prisma.stockMovement.findMany({
        where: { userId: user.id },
        select: {
          productId: true,
          type: true,
          quantity: true,
          unitCost: true,
          occurredAt: true,
        },
      });
      const stock = new Map<string, number>();
      const costByCategory = new Map<string, number>();
      moves.forEach((m) => {
        const s = stock.get(m.productId) || 0;
        const q =
          m.type === "in" ? m.quantity : m.type === "out" ? -m.quantity : 0;
        stock.set(m.productId, s + q);
      });
      // Cost by category: approximate sum of out movements unitCost*quantity within range
      const from = input?.from ? new Date(input.from) : null;
      const to = input?.to ? new Date(input.to) : null;
      const productsWithCat = await ctx.prisma.product.findMany({
        where: { id: { in: Array.from(stock.keys()) } },
        select: { id: true, category: true },
      });
      const catMap = new Map(
        productsWithCat.map(
          (p) => [p.id, p.category || "Sin categoría"] as const
        )
      );
      moves.forEach((m) => {
        if (m.type !== "out") return;
        const d = new Date(m.occurredAt);
        if (from && d < from) return;
        if (to && d > to) return;
        const cat = catMap.get(m.productId) || "Sin categoría";
        costByCategory.set(
          cat,
          (costByCategory.get(cat) || 0) + (m.unitCost || 0) * m.quantity
        );
      });
      const low = products
        .map((p) => ({
          product: p,
          current: stock.get(p.id) || 0,
          min: p.minStock || 0,
        }))
        .filter((r) => r.min > 0 && r.current < r.min)
        .sort((a, b) => a.current - b.current)
        .slice(0, input?.topLow ?? 10);
      return {
        lowStock: low,
        costByCategory: Array.from(costByCategory.entries()).map(
          ([label, value]) => ({ label, value })
        ),
      };
    }),

  listSuppliers: protectedProcedure
    .input(
      z
        .object({
          q: z.string().optional(),
          limit: z.number().min(1).max(200).default(100),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const where: any = {
        userId: (
          await ctx.prisma.user.findUnique({
            where: { clerkId: ctx.userId },
            select: { id: true },
          })
        )?.id,
      };
      if (!where.userId) throw new Error("User not found");
      if (input?.q) where.name = { contains: input.q, mode: "insensitive" };
      return ctx.prisma.supplier.findMany({
        where,
        orderBy: { name: "asc" },
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
