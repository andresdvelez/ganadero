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

  updateInvoiceStatus: protectedProcedure
    .input(
      z.object({
        invoiceId: z.string(),
        status: z.enum(["open", "paid", "cancelled"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const inv = await ctx.prisma.purchaseInvoice.findFirst({
        where: { id: input.invoiceId, userId: ctx.userId! },
        select: { id: true },
      });
      if (!inv) throw new Error("Factura no encontrada");
      return ctx.prisma.purchaseInvoice.update({
        where: { id: inv.id },
        data: { status: input.status },
      });
    }),

  createDebitCreditNote: protectedProcedure
    .input(
      z.object({
        invoiceId: z.string(),
        type: z.enum(["debit", "credit"]),
        reason: z.string().optional(),
        amount: z.number().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const inv = await ctx.prisma.purchaseInvoice.findFirst({
        where: { id: input.invoiceId, userId: ctx.userId! },
      });
      if (!inv) throw new Error("Factura no encontrada");
      const sign = input.type === "credit" ? -1 : 1;
      const delta = sign * input.amount;
      // Represent as an extra item adjustment
      await ctx.prisma.purchaseInvoice.update({
        where: { id: inv.id },
        data: {
          subtotal: inv.subtotal + delta,
          total: inv.total + delta,
          notes:
            (inv.notes ? inv.notes + "\n" : "") +
            `${input.type.toUpperCase()}::${Date.now()}::${input.amount}::${
              input.reason || ""
            }`,
          items: {
            create: [
              {
                description:
                  input.type === "credit" ? "Nota crédito" : "Nota débito",
                quantity: 1,
                unit: "ajuste",
                unitCost: delta,
                total: delta,
              },
            ],
          },
        },
      });
      return { ok: true };
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

  // Attachments (demo): guardar referencia en notes con metadatos, sin archivo
  attachInvoiceFile: protectedProcedure
    .input(
      z.object({
        invoiceId: z.string(),
        fileName: z.string(),
        mimeType: z.string(),
        dataUrl: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const inv = await ctx.prisma.purchaseInvoice.findFirst({
        where: { id: input.invoiceId, userId: ctx.userId! },
        select: { id: true, notes: true },
      });
      if (!inv) throw new Error("Factura no encontrada");
      const prev = inv.notes ? inv.notes + "\n" : "";
      const tag = `ATTACH::${Date.now()}::${input.fileName}::${input.mimeType}`;
      await ctx.prisma.purchaseInvoice.update({
        where: { id: inv.id },
        data: { notes: prev + tag },
      });
      return { ok: true, tag };
    }),
  listInvoiceAttachments: protectedProcedure
    .input(z.object({ invoiceId: z.string() }))
    .query(async ({ ctx, input }) => {
      const inv = await ctx.prisma.purchaseInvoice.findFirst({
        where: { id: input.invoiceId, userId: ctx.userId! },
        select: { notes: true },
      });
      const list = (inv?.notes || "")
        .split("\n")
        .filter((l) => l.startsWith("ATTACH::"))
        .map((l) => {
          const [, ts, fileName, mimeType] = l.split("::");
          return { id: ts, fileName, mimeType };
        });
      return list;
    }),

  // Aging por proveedor (CxP)
  aging: protectedProcedure
    .input(z.object({ asOf: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const asOf = input?.asOf ? new Date(input.asOf) : new Date();
      const rows = await ctx.prisma.purchaseInvoice.findMany({
        where: { userId: ctx.userId!, status: { in: ["open", "paid"] } },
        select: {
          id: true,
          supplierId: true,
          date: true,
          total: true,
          payments: true,
          supplier: { select: { id: true, name: true } },
        },
      });
      const bySup = new Map<
        string,
        { name: string; b0: number; b30: number; b60: number; b90: number }
      >();
      rows.forEach((r) => {
        const paid = (r.payments || []).reduce((s, p) => s + p.amount, 0);
        const due = Math.max(0, (r.total || 0) - paid);
        if (due <= 0) return;
        const days = Math.floor(
          (asOf.getTime() - new Date(r.date).getTime()) / 86400000
        );
        const key = r.supplierId;
        const name = r.supplier?.name || "(Sin proveedor)";
        const agg = bySup.get(key) || { name, b0: 0, b30: 0, b60: 0, b90: 0 };
        if (days <= 30) agg.b0 += due;
        else if (days <= 60) agg.b30 += due;
        else if (days <= 90) agg.b60 += due;
        else agg.b90 += due;
        bySup.set(key, agg);
      });
      return Array.from(bySup.entries()).map(([supplierId, v]) => ({
        supplierId,
        supplier: v.name,
        bucket0_30: v.b0,
        bucket31_60: v.b30,
        bucket61_90: v.b60,
        bucket90_plus: v.b90,
      }));
    }),
});
