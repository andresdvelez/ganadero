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
      const animal = await ctx.prisma.animal.findFirst({
        where: { id: input.animalId, user: { clerkId: ctx.userId! } },
        select: { id: true },
      });
      if (!animal) throw new Error("Animal no encontrado o sin permisos");
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
        include: {
          animal: { select: { id: true, name: true, tagNumber: true } },
        },
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
      const exists = await ctx.prisma.mastitisCase.findFirst({
        where: { id: input.id, userId: ctx.userId! },
        select: { id: true },
      });
      if (!exists) throw new Error("Sin permisos sobre este caso");
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

  // Crear y vincular examen de laboratorio para un caso de mastitis
  createLabExam: protectedProcedure
    .input(z.object({ caseId: z.string(), labName: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const mc = await ctx.prisma.mastitisCase.findFirst({
        where: { id: input.caseId, userId: ctx.userId! },
      });
      if (!mc) throw new Error("Caso no encontrado o sin permisos");
      const exam = await ctx.prisma.labExam.create({
        data: {
          userId: ctx.userId!,
          animalId: mc.animalId,
          examType: "mastitis",
          sampleType: "milk",
          labName: input.labName || null,
          requestedAt: new Date(),
          notes: `Relacionado al caso ${mc.id}`,
        },
      });
      await ctx.prisma.mastitisCase.update({
        where: { id: mc.id },
        data: { labExamId: exam.id },
      });
      return exam;
    }),
  labExamByCase: protectedProcedure
    .input(z.object({ caseId: z.string() }))
    .query(async ({ ctx, input }) => {
      const mc = await ctx.prisma.mastitisCase.findFirst({
        where: { id: input.caseId, userId: ctx.userId! },
      });
      if (!mc || !mc.labExamId) return null;
      return ctx.prisma.labExam.findFirst({
        where: { id: mc.labExamId, userId: ctx.userId! },
      });
    }),

  // Serie de CCS desde MilkRecord para calidad de leche
  ccsTrend: protectedProcedure
    .input(
      z
        .object({
          animalId: z.string().optional(),
          from: z.string().optional(),
          to: z.string().optional(),
          bucket: z.enum(["day", "week", "month"]).default("day"),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const where: any = { userId: ctx.userId!, ccs: { not: null } };
      if (input?.animalId) where.animalId = input.animalId;
      if (input?.from || input?.to) where.recordedAt = {};
      if (input?.from) where.recordedAt.gte = new Date(input.from);
      if (input?.to) where.recordedAt.lte = new Date(input.to);
      const rows = await ctx.prisma.milkRecord.findMany({
        where,
        orderBy: { recordedAt: "asc" },
        select: { recordedAt: true, ccs: true, animalId: true },
      });

      const bucketOf = (d: Date) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        if (input?.bucket === "month") return `${y}-${m}`;
        if (input?.bucket === "week") {
          const first = new Date(d.getFullYear(), 0, 1);
          const week = Math.ceil(
            ((d.getTime() - first.getTime()) / 86400000 + first.getDay() + 1) /
              7
          );
          return `${y}-W${week}`;
        }
        return `${y}-${m}-${day}`;
      };

      const agg: Record<string, { sum: number; n: number }> = {};
      for (const r of rows) {
        if (r.ccs == null) continue;
        const key = bucketOf(r.recordedAt);
        const a = agg[key] || { sum: 0, n: 0 };
        a.sum += r.ccs;
        a.n += 1;
        agg[key] = a;
      }
      const series = Object.entries(agg)
        .map(([period, v]) => ({
          period,
          value: Math.round((v.sum / v.n) * 100) / 100,
        }))
        .sort((a, b) => (a.period > b.period ? 1 : -1));
      return { series };
    }),
});
