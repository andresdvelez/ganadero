import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const financeApRouter = createTRPCRouter({
  // Suppliers
  createSupplier: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        taxId: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().optional(),
        address: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.supplier.create({
        data: {
          userId: ctx.userId!,
          name: input.name,
          taxId: input.taxId || null,
          phone: input.phone || null,
          email: input.email || null,
          address: input.address || null,
          notes: input.notes || null,
        },
      });
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
      const where: any = { userId: ctx.userId! };
      if (input?.q) where.name = { contains: input.q, mode: "insensitive" };
      return ctx.prisma.supplier.findMany({
        where,
        orderBy: { name: "asc" },
        take: input?.limit ?? 100,
      });
    }),

  // Purchase Invoices
  createInvoice: protectedProcedure
    .input(
      z.object({
        supplierId: z.string(),
        invoiceNumber: z.string().optional(),
        date: z.string(),
        items: z.array(
          z.object({
            productId: z.string().optional(),
            description: z.string().optional(),
            quantity: z.number().positive(),
            unit: z.string().optional(),
            unitCost: z.number().nonnegative(),
          })
        ),
        notes: z.string().optional(),
        tax: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const subtotal = input.items.reduce(
        (sum, it) => sum + it.unitCost * it.quantity,
        0
      );
      const tax = input.tax ?? 0;
      const total = subtotal + tax;
      return ctx.prisma.purchaseInvoice.create({
        data: {
          userId: ctx.userId!,
          supplierId: input.supplierId,
          invoiceNumber: input.invoiceNumber || null,
          date: new Date(input.date),
          subtotal,
          tax,
          total,
          notes: input.notes || null,
          items: {
            create: input.items.map((it) => ({
              productId: it.productId || null,
              description: it.description || null,
              quantity: it.quantity,
              unit: it.unit || null,
              unitCost: it.unitCost,
              total: it.unitCost * it.quantity,
            })),
          },
        },
      });
    }),
  listInvoices: protectedProcedure
    .input(
      z
        .object({
          supplierId: z.string().optional(),
          status: z.string().optional(),
          limit: z.number().min(1).max(200).default(100),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const where: any = { userId: ctx.userId! };
      if (input?.supplierId) where.supplierId = input.supplierId;
      if (input?.status) where.status = input.status;
      return ctx.prisma.purchaseInvoice.findMany({
        where,
        orderBy: { date: "desc" },
        take: input?.limit ?? 100,
        include: { items: true, payments: true, supplier: true },
      });
    }),
  payInvoice: protectedProcedure
    .input(
      z.object({
        invoiceId: z.string(),
        date: z.string(),
        amount: z.number().positive(),
        method: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const payment = await ctx.prisma.invoicePayment.create({
        data: {
          userId: ctx.userId!,
          invoiceId: input.invoiceId,
          date: new Date(input.date),
          amount: input.amount,
          method: input.method || null,
          notes: input.notes || null,
        },
      });
      // Optional: update invoice status if fully paid
      const inv = await ctx.prisma.purchaseInvoice.findUnique({
        where: { id: input.invoiceId },
        include: { payments: true },
      });
      if (inv) {
        const paid =
          (inv.payments?.reduce((s, p) => s + p.amount, 0) || 0) + input.amount;
        const status = paid >= inv.total ? "paid" : inv.status;
        if (status !== inv.status) {
          await ctx.prisma.purchaseInvoice.update({
            where: { id: inv.id },
            data: { status },
          });
        }
      }
      return payment;
    }),
});
