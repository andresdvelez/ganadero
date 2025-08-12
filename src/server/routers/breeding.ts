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
        include: {
          animals: {
            include: {
              animal: { select: { id: true, tagNumber: true, name: true } },
            },
          },
        },
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
      // Validate animal belongs to user
      const animal = await ctx.prisma.animal.findFirst({
        where: { id: input.animalId, user: { clerkId: ctx.userId! } },
        select: { id: true },
      });
      if (!animal) throw new Error("Animal no encontrado o sin permisos");
      // Validate batch belongs to user
      const batch = await ctx.prisma.breedingSyncBatch.findFirst({
        where: { id: input.batchId, userId: ctx.userId! },
        select: { id: true },
      });
      if (!batch) throw new Error("Lote no encontrado o sin permisos");
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
      // Ensure the sync animal belongs to a batch of the user
      const exists = await ctx.prisma.breedingSyncAnimal.findFirst({
        where: { id: input.id, batch: { userId: ctx.userId! } },
        select: { id: true },
      });
      if (!exists) throw new Error("Sin permisos sobre este registro");
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
      const animal = await ctx.prisma.animal.findFirst({
        where: { id: input.animalId, user: { clerkId: ctx.userId! } },
        select: { id: true },
      });
      if (!animal) throw new Error("Animal no encontrado o sin permisos");
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
        include: {
          animal: { select: { id: true, name: true, tagNumber: true } },
        },
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
      const animal = await ctx.prisma.animal.findFirst({
        where: { id: input.animalId, user: { clerkId: ctx.userId! } },
        select: { id: true },
      });
      if (!animal) throw new Error("Animal no encontrado o sin permisos");
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
        include: {
          animal: { select: { id: true, name: true, tagNumber: true } },
        },
      });
    }),

  // KPIs: días abiertos (avg), tasa de preñez, IEP (intervalo entre partos)
  kpis: protectedProcedure
    .input(
      z
        .object({ from: z.string().optional(), to: z.string().optional() })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const from = input?.from ? new Date(input.from) : null;
      const to = input?.to ? new Date(input.to) : null;

      // Fetch breeding records
      const whereBR: any = { userId: ctx.userId! };
      if (from || to) whereBR.eventDate = {};
      if (from) whereBR.eventDate.gte = from;
      if (to) whereBR.eventDate.lte = to;
      const records = await ctx.prisma.breedingRecord.findMany({
        where: whereBR,
        orderBy: { eventDate: "asc" },
        select: {
          animalId: true,
          eventType: true,
          eventDate: true,
          pregnancyStatus: true,
        },
      });

      // Group by animal
      const byAnimal = new Map<
        string,
        { type: string; date: Date; preg?: string }[]
      >();
      for (const r of records) {
        const arr = byAnimal.get(r.animalId) || [];
        arr.push({
          type: r.eventType,
          date: r.eventDate,
          preg: r.pregnancyStatus || undefined,
        });
        byAnimal.set(r.animalId, arr);
      }

      // Compute KPIs
      const daysOpenArr: number[] = [];
      const iepArr: number[] = [];
      let insems = 0;
      let pregConfirmed = 0;

      byAnimal.forEach((events) => {
        events.sort((a, b) => a.date.getTime() - b.date.getTime());
        // IEP: consecutive births difference
        const births = events
          .filter((e) => e.type === "birth")
          .map((e) => e.date);
        for (let i = 1; i < births.length; i++) {
          const diff =
            (births[i].getTime() - births[i - 1].getTime()) / 86400000;
          if (diff > 0 && diff < 1000) iepArr.push(diff);
        }
        // Days open: from last birth to first insemination after birth
        for (let i = births.length - 1; i >= 0; i--) {
          const birthDate = births[i];
          const after = events.find(
            (e) =>
              e.date > birthDate &&
              (e.type === "insemination" || e.type === "service")
          );
          if (after) {
            const diff =
              (after.date.getTime() - birthDate.getTime()) / 86400000;
            if (diff > 0 && diff < 600) daysOpenArr.push(diff);
            break;
          }
        }
        // Pregnancy rate: confirmed pregnancy checks over inseminations
        const ins = events.filter((e) => e.type === "insemination").length;
        const conf = events.filter(
          (e) =>
            e.type === "pregnancy_check" &&
            (e.preg || "").toLowerCase() === "confirmed"
        ).length;
        insems += ins;
        pregConfirmed += conf;
      });

      const avg = (arr: number[]) =>
        arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
      const kpis = {
        avgDaysOpen: Math.round(avg(daysOpenArr)),
        pregnancyRate:
          insems > 0 ? Math.round((pregConfirmed / insems) * 1000) / 10 : 0, // %
        avgCalvingInterval: Math.round(avg(iepArr)),
        samples: {
          daysOpen: daysOpenArr.length,
          iep: iepArr.length,
          inseminations: insems,
        },
      };

      // Simple time series for conception trend: monthly confirmed pregnancies
      const monthlyTrend: Record<string, number> = {};
      for (const [animalId, events] of byAnimal) {
        for (const e of events) {
          if (
            e.type === "pregnancy_check" &&
            (e.preg || "").toLowerCase() === "confirmed"
          ) {
            const d = e.date;
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
              2,
              "0"
            )}`;
            monthlyTrend[key] = (monthlyTrend[key] || 0) + 1;
          }
        }
      }
      const trend = Object.entries(monthlyTrend)
        .sort((a, b) => (a[0] > b[0] ? 1 : -1))
        .map(([period, value]) => ({ period, value }));

      return { kpis, trend };
    }),
});
