import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

function assertNoConflict<T extends { updatedAt: Date }>(opts: {
  existing: T | null;
  expectedUpdatedAt?: string | null;
  incoming: any;
}) {
  if (!opts.existing || !opts.expectedUpdatedAt) return;
  const expected = new Date(opts.expectedUpdatedAt);
  const actual = new Date(opts.existing.updatedAt);
  if (Number.isNaN(expected.getTime())) return;
  if (actual.getTime() !== expected.getTime()) {
    // Include current and incoming for client-side merge/UX
    throw new TRPCError({
      code: "CONFLICT",
      message: JSON.stringify({
        reason: "VERSION_MISMATCH",
        currentUpdatedAt: opts.existing.updatedAt,
        expectedUpdatedAt: opts.expectedUpdatedAt,
        current: opts.existing,
        incoming: opts.incoming,
      }),
    });
  }
}

export const syncRouter = createTRPCRouter({
  pull: protectedProcedure
    .input(z.object({ cursor: z.string().nullable().optional() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { clerkId: ctx.userId },
      });
      if (!user) throw new Error("User not found");
      const since = input.cursor ? new Date(input.cursor) : new Date(0);

      const [
        animals,
        health,
        breeding,
        products,
        stocks,
        milk,
        pastures,
        labs,
        tasks,
        finances,
        sensors,
        locations,
        tombs,
      ] = await Promise.all([
        ctx.prisma.animal.findMany({
          where: { userId: user.id, updatedAt: { gt: since } },
        }),
        ctx.prisma.healthRecord.findMany({
          where: { userId: user.id, updatedAt: { gt: since } },
        }),
        ctx.prisma.breedingRecord.findMany({
          where: { userId: user.id, updatedAt: { gt: since } },
        }),
        ctx.prisma.product.findMany({
          where: { userId: user.id, updatedAt: { gt: since } },
        }),
        ctx.prisma.stockMovement.findMany({
          where: { userId: user.id, updatedAt: { gt: since } },
        }),
        ctx.prisma.milkRecord.findMany({
          where: { userId: user.id, updatedAt: { gt: since } },
        }),
        ctx.prisma.pasture.findMany({
          where: { userId: user.id, updatedAt: { gt: since } },
        }),
        ctx.prisma.labExam.findMany({
          where: { userId: user.id, updatedAt: { gt: since } },
        }),
        ctx.prisma.task.findMany({
          where: { userId: user.id, updatedAt: { gt: since } },
        }),
        ctx.prisma.financeTransaction.findMany({
          where: { userId: user.id, updatedAt: { gt: since } },
        }),
        ctx.prisma.sensor.findMany({
          where: { userId: user.id, updatedAt: { gt: since } },
        }),
        ctx.prisma.location.findMany({
          where: { userId: user.id, updatedAt: { gt: since } },
        }),
        ctx.prisma.deletionLog.findMany({
          where: { userId: user.id, deletedAt: { gt: since } },
        }),
      ]);

      const nextCursor = new Date().toISOString();
      return {
        cursor: nextCursor,
        changes: {
          animals,
          health,
          breeding,
          products,
          stocks,
          milk,
          pastures,
          labs,
          tasks,
          finances,
          sensors,
          locations,
        },
        tombstones: tombs.map((t) => ({
          entityType: t.entityType,
          entityId: t.entityId,
          deletedAt: t.deletedAt,
        })),
      };
    }),

  upsertAnimal: protectedProcedure
    .input(
      z.object({
        externalId: z.string(),
        data: z.any(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { externalId, data } = input;
      const user = await ctx.prisma.user.findUnique({
        where: { clerkId: ctx.userId },
      });
      if (!user) throw new Error("User not found");

      const existing = await ctx.prisma.animal.findFirst({
        where: { externalId },
      });

      const payload = {
        externalId,
        userId: user.id,
        name: data.name,
        tagNumber: data.tagNumber,
        species: data.species ?? "cattle",
        breed: data.breed ?? null,
        sex: data.sex,
        birthDate: data.birthDate ? new Date(data.birthDate) : null,
        weight: data.weight ?? null,
        color: data.color ?? null,
        status: data.status ?? "active",
        imageUrl: data.imageUrl ?? null,
        metadata: data.metadata ?? null,
        qrCode: data.qrCode ?? null,
        nfcId: data.nfcId ?? null,
      } as any;

      assertNoConflict({
        existing: existing as any,
        expectedUpdatedAt: data?.expectedUpdatedAt,
        incoming: payload,
      });

      const saved = existing
        ? await ctx.prisma.animal.update({
            where: { id: existing.id },
            data: payload,
          })
        : await ctx.prisma.animal.create({ data: payload });

      return saved;
    }),

  upsertHealth: protectedProcedure
    .input(z.object({ externalId: z.string(), data: z.any() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { clerkId: ctx.userId },
      });
      if (!user) throw new Error("User not found");
      const { externalId, data } = input;
      const animal = data.animalExternalId
        ? await ctx.prisma.animal.findFirst({
            where: { externalId: data.animalExternalId },
          })
        : null;
      const existing = await ctx.prisma.healthRecord.findFirst({
        where: { externalId },
      });
      const payload = {
        externalId,
        userId: user.id,
        animalId: animal?.id ?? data.animalId,
        type: data.type,
        description: data.description,
        medication: data.medication ?? null,
        dosage: data.dosage ?? null,
        veterinarian: data.veterinarian ?? null,
        cost: data.cost ?? null,
        notes: data.notes ?? null,
        performedAt: new Date(data.performedAt),
        nextDueDate: data.nextDueDate ? new Date(data.nextDueDate) : null,
      } as any;

      assertNoConflict({
        existing: existing as any,
        expectedUpdatedAt: data?.expectedUpdatedAt,
        incoming: payload,
      });

      const saved = existing
        ? await ctx.prisma.healthRecord.update({
            where: { id: existing.id },
            data: payload,
          })
        : await ctx.prisma.healthRecord.create({ data: payload });
      return saved;
    }),

  upsertBreeding: protectedProcedure
    .input(z.object({ externalId: z.string(), data: z.any() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { clerkId: ctx.userId },
      });
      if (!user) throw new Error("User not found");
      const { externalId, data } = input;
      const animal = data.animalExternalId
        ? await ctx.prisma.animal.findFirst({
            where: { externalId: data.animalExternalId },
          })
        : null;
      const existing = await ctx.prisma.breedingRecord.findFirst({
        where: { externalId },
      });
      const payload = {
        externalId,
        userId: user.id,
        animalId: animal?.id ?? data.animalId,
        eventType: data.eventType,
        eventDate: new Date(data.eventDate),
        sireId: data.sireId ?? null,
        inseminationType: data.inseminationType ?? null,
        pregnancyStatus: data.pregnancyStatus ?? null,
        expectedDueDate: data.expectedDueDate
          ? new Date(data.expectedDueDate)
          : null,
        actualBirthDate: data.actualBirthDate
          ? new Date(data.actualBirthDate)
          : null,
        offspringCount: data.offspringCount ?? null,
        notes: data.notes ?? null,
      } as any;

      assertNoConflict({
        existing: existing as any,
        expectedUpdatedAt: data?.expectedUpdatedAt,
        incoming: payload,
      });

      const saved = existing
        ? await ctx.prisma.breedingRecord.update({
            where: { id: existing.id },
            data: payload,
          })
        : await ctx.prisma.breedingRecord.create({ data: payload });
      return saved;
    }),

  // Inventory: Product
  upsertProduct: protectedProcedure
    .input(z.object({ externalId: z.string(), data: z.any() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { clerkId: ctx.userId },
      });
      if (!user) throw new Error("User not found");
      const { externalId, data } = input;
      const existing = await ctx.prisma.product.findFirst({
        where: { externalId },
      });
      const payload = {
        externalId,
        userId: user.id,
        code: data.code,
        name: data.name,
        category: data.category ?? null,
        unit: data.unit ?? "unidad",
        minStock: data.minStock ?? null,
        currentStock: data.currentStock ?? 0,
        cost: data.cost ?? null,
        supplier: data.supplier ?? null,
        notes: data.notes ?? null,
      } as any;

      assertNoConflict({
        existing: existing as any,
        expectedUpdatedAt: data?.expectedUpdatedAt,
        incoming: payload,
      });

      const saved = existing
        ? await ctx.prisma.product.update({
            where: { id: existing.id },
            data: payload,
          })
        : await ctx.prisma.product.create({ data: payload });
      return saved;
    }),

  // Inventory: Stock Movement
  upsertStockMovement: protectedProcedure
    .input(z.object({ externalId: z.string(), data: z.any() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { clerkId: ctx.userId },
      });
      if (!user) throw new Error("User not found");
      const { externalId, data } = input;
      const product = data.productExternalId
        ? await ctx.prisma.product.findFirst({
            where: { externalId: data.productExternalId },
          })
        : data.productId
        ? await ctx.prisma.product.findUnique({ where: { id: data.productId } })
        : null;
      if (!product) throw new Error("Product not found for stock movement");
      const existing = await ctx.prisma.stockMovement.findFirst({
        where: { externalId },
      });
      const payload = {
        externalId,
        userId: user.id,
        productId: product.id,
        type: data.type,
        quantity: data.quantity,
        unitCost: data.unitCost ?? null,
        reason: data.reason ?? null,
        relatedEntity: data.relatedEntity ?? null,
        occurredAt: new Date(data.occurredAt),
      } as any;

      assertNoConflict({
        existing: existing as any,
        expectedUpdatedAt: data?.expectedUpdatedAt,
        incoming: payload,
      });

      const saved = existing
        ? await ctx.prisma.stockMovement.update({
            where: { id: existing.id },
            data: payload,
          })
        : await ctx.prisma.stockMovement.create({ data: payload });
      return saved;
    }),

  // Milk
  upsertMilk: protectedProcedure
    .input(z.object({ externalId: z.string(), data: z.any() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { clerkId: ctx.userId },
      });
      if (!user) throw new Error("User not found");
      const { externalId, data } = input;
      const animal = data.animalExternalId
        ? await ctx.prisma.animal.findFirst({
            where: { externalId: data.animalExternalId },
          })
        : data.animalId
        ? await ctx.prisma.animal.findUnique({ where: { id: data.animalId } })
        : null;
      const existing = await ctx.prisma.milkRecord.findFirst({
        where: { externalId },
      });
      const payload = {
        externalId,
        userId: user.id,
        animalId: animal?.id ?? null,
        session: data.session,
        liters: data.liters,
        fatPct: data.fatPct ?? null,
        proteinPct: data.proteinPct ?? null,
        ccs: data.ccs ?? null,
        notes: data.notes ?? null,
        recordedAt: new Date(data.recordedAt),
      } as any;

      assertNoConflict({
        existing: existing as any,
        expectedUpdatedAt: data?.expectedUpdatedAt,
        incoming: payload,
      });

      const saved = existing
        ? await ctx.prisma.milkRecord.update({
            where: { id: existing.id },
            data: payload,
          })
        : await ctx.prisma.milkRecord.create({ data: payload });
      return saved;
    }),

  // Pastures
  upsertPasture: protectedProcedure
    .input(z.object({ externalId: z.string(), data: z.any() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { clerkId: ctx.userId },
      });
      if (!user) throw new Error("User not found");
      const { externalId, data } = input;
      const existing = await ctx.prisma.pasture.findFirst({
        where: { externalId },
      });
      const payload = {
        externalId,
        userId: user.id,
        name: data.name,
        areaHa: data.areaHa ?? null,
        currentGroup: data.currentGroup ?? null,
        occupancySince: data.occupancySince
          ? new Date(data.occupancySince)
          : null,
        notes: data.notes ?? null,
      } as any;

      assertNoConflict({
        existing: existing as any,
        expectedUpdatedAt: data?.expectedUpdatedAt,
        incoming: payload,
      });

      const saved = existing
        ? await ctx.prisma.pasture.update({
            where: { id: existing.id },
            data: payload,
          })
        : await ctx.prisma.pasture.create({ data: payload });
      return saved;
    }),

  // Lab exams
  upsertLabExam: protectedProcedure
    .input(z.object({ externalId: z.string(), data: z.any() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { clerkId: ctx.userId },
      });
      if (!user) throw new Error("User not found");
      const { externalId, data } = input;
      const animal = data.animalExternalId
        ? await ctx.prisma.animal.findFirst({
            where: { externalId: data.animalExternalId },
          })
        : null;
      const existing = await ctx.prisma.labExam.findFirst({
        where: { externalId },
      });
      const payload = {
        externalId,
        userId: user.id,
        animalId: animal?.id ?? data.animalId,
        examType: data.examType,
        sampleType: data.sampleType ?? null,
        labName: data.labName ?? null,
        requestedAt: new Date(data.requestedAt),
        resultAt: data.resultAt ? new Date(data.resultAt) : null,
        result: data.result ?? null,
        antibiogram: data.antibiogram ?? null,
        notes: data.notes ?? null,
      } as any;

      assertNoConflict({
        existing: existing as any,
        expectedUpdatedAt: data?.expectedUpdatedAt,
        incoming: payload,
      });

      const saved = existing
        ? await ctx.prisma.labExam.update({
            where: { id: existing.id },
            data: payload,
          })
        : await ctx.prisma.labExam.create({ data: payload });
      return saved;
    }),

  upsertTask: protectedProcedure
    .input(z.object({ externalId: z.string(), data: z.any() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { clerkId: ctx.userId },
      });
      if (!user) throw new Error("User not found");
      const { externalId, data } = input;
      const existing = await ctx.prisma.task.findFirst({
        where: { id: externalId },
      });
      const payload = {
        userId: user.id,
        title: data.title,
        description: data.description ?? null,
        status: data.status ?? "open",
        priority: data.priority ?? null,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
      } as any;
      const saved = existing
        ? await ctx.prisma.task.update({
            where: { id: existing.id },
            data: payload,
          })
        : await ctx.prisma.task.create({
            data: { ...payload, id: externalId },
          });
      return saved;
    }),

  upsertFinance: protectedProcedure
    .input(z.object({ externalId: z.string(), data: z.any() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { clerkId: ctx.userId },
      });
      if (!user) throw new Error("User not found");
      const { externalId, data } = input;
      const existing = await ctx.prisma.financeTransaction.findFirst({
        where: { id: externalId },
      });
      const payload = {
        userId: user.id,
        type: data.type,
        category: data.category ?? null,
        amount: data.amount,
        currency: data.currency ?? "COP",
        date: new Date(data.date),
        counterparty: data.counterparty ?? null,
        notes: data.notes ?? null,
      } as any;
      const saved = existing
        ? await ctx.prisma.financeTransaction.update({
            where: { id: existing.id },
            data: payload,
          })
        : await ctx.prisma.financeTransaction.create({
            data: { ...payload, id: externalId },
          });
      return saved;
    }),

  upsertSensor: protectedProcedure
    .input(z.object({ externalId: z.string(), data: z.any() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { clerkId: ctx.userId },
      });
      if (!user) throw new Error("User not found");
      const { externalId, data } = input;
      const existing = await ctx.prisma.sensor.findFirst({
        where: { id: externalId },
      });
      const payload = {
        userId: user.id,
        name: data.name,
        type: data.type ?? null,
        status: data.status ?? "inactive",
        lastReadingAt: data.lastReadingAt ? new Date(data.lastReadingAt) : null,
        locationName: data.locationName ?? null,
        notes: data.notes ?? null,
      } as any;
      const saved = existing
        ? await ctx.prisma.sensor.update({
            where: { id: existing.id },
            data: payload,
          })
        : await ctx.prisma.sensor.create({
            data: { ...payload, id: externalId },
          });
      return saved;
    }),

  upsertLocation: protectedProcedure
    .input(z.object({ externalId: z.string(), data: z.any() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { clerkId: ctx.userId },
      });
      if (!user) throw new Error("User not found");
      const { externalId, data } = input;
      const existing = await ctx.prisma.location.findFirst({
        where: { id: externalId },
      });
      const payload = {
        userId: user.id,
        name: data.name,
        type: data.type ?? null,
        lat: data.lat ?? null,
        lng: data.lng ?? null,
        areaHa: data.areaHa ?? null,
        notes: data.notes ?? null,
      } as any;
      const saved = existing
        ? await ctx.prisma.location.update({
            where: { id: existing.id },
            data: payload,
          })
        : await ctx.prisma.location.create({
            data: { ...payload, id: externalId },
          });
      return saved;
    }),

  // AI Conversation entries (chat messages and metadata)
  upsertAIConversation: protectedProcedure
    .input(z.object({ data: z.any() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { clerkId: ctx.userId },
      });
      if (!user) throw new Error("User not found");
      const d = input.data || {};
      const sessionId = String(d.sessionId);
      const role = String(d.role || "user");
      const content = String(d.content || "");
      const createdAt = d.createdAt ? new Date(d.createdAt) : new Date();

      // Avoid duplicates: check if a record with matching fields exists
      const existing = await ctx.prisma.aIConversation.findFirst({
        where: {
          userId: user.id,
          sessionId,
          role,
          content,
          createdAt,
        },
      });
      if (existing) return existing;
      const saved = await ctx.prisma.aIConversation.create({
        data: {
          userId: user.id,
          sessionId,
          role,
          content,
          moduleContext: d.moduleContext ?? null,
          metadata: d.metadata ? JSON.stringify(d.metadata) : null,
          createdAt,
        } as any,
      });
      return saved;
    }),
});
