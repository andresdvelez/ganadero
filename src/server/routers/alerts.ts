import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const alertsRouter = createTRPCRouter({
  createRule: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        module: z.string(),
        condition: z.string(),
        enabled: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.alertRule.create({
        data: {
          userId: ctx.userId!,
          name: input.name,
          module: input.module,
          condition: input.condition,
          enabled: input.enabled ?? true,
        },
      });
    }),
  listRules: protectedProcedure
    .input(
      z
        .object({
          module: z.string().optional(),
          enabled: z.boolean().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const where: any = { userId: ctx.userId! };
      if (input?.module) where.module = input.module;
      if (input?.enabled !== undefined) where.enabled = input.enabled;
      return ctx.prisma.alertRule.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });
    }),
  updateRule: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: z.object({
          name: z.string().optional(),
          module: z.string().optional(),
          condition: z.string().optional(),
          enabled: z.boolean().optional(),
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.alertRule.update({
        where: { id: input.id },
        data: input.data,
      });
    }),
  seedDefaultRules: protectedProcedure.mutation(async ({ ctx }) => {
    const defaults = [
      {
        name: "Repro: palpación 30-60 días post-servicio",
        module: "breeding",
        condition: "to_palpate_30_60",
      },
      {
        name: "Repro: celo sin programar (<=21 días)",
        module: "breeding",
        condition: "unscheduled_heat",
      },
      {
        name: "Leche: CCS promedio alto",
        module: "milk",
        condition: "ccs_gt_400k",
      },
      {
        name: "Salud: seguimiento vencido",
        module: "health",
        condition: "health_next_due_overdue",
      },
      {
        name: "Inventario: stock bajo",
        module: "inventory",
        condition: "stock_below_min",
      },
    ];
    for (const d of defaults) {
      const exists = await ctx.prisma.alertRule.findFirst({
        where: { userId: ctx.userId!, name: d.name },
      });
      if (!exists) {
        await ctx.prisma.alertRule.create({
          data: {
            userId: ctx.userId!,
            name: d.name,
            module: d.module,
            condition: d.condition,
            enabled: true,
          },
        });
      }
    }
    return { ok: true };
  }),
  triggerRule: protectedProcedure
    .input(
      z.object({
        ruleId: z.string(),
        entityType: z.string(),
        entityId: z.string(),
        payload: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Simple manual trigger; an evaluator service can be added later
      const rule = await ctx.prisma.alertRule.findUnique({
        where: { id: input.ruleId },
      });
      if (!rule || rule.userId !== ctx.userId)
        throw new Error("Rule not found");
      return ctx.prisma.alertInstance.create({
        data: {
          userId: ctx.userId!,
          ruleId: input.ruleId,
          entityType: input.entityType,
          entityId: input.entityId,
          payload: input.payload || null,
        },
      });
    }),
  evaluateAll: protectedProcedure
    .input(
      z.object({ sinceDays: z.number().min(1).max(180).default(60) }).optional()
    )
    .mutation(async ({ ctx, input }) => {
      const sinceDays = input?.sinceDays ?? 60;
      const now = new Date();
      const since = new Date(now.getTime() - sinceDays * 86400000);
      const rules = await ctx.prisma.alertRule.findMany({
        where: { userId: ctx.userId!, enabled: true },
      });

      async function createIfNotExists(
        ruleId: string,
        entityType: string,
        entityId: string,
        payload?: string
      ) {
        const open = await ctx.prisma.alertInstance.findFirst({
          where: {
            userId: ctx.userId!,
            ruleId,
            entityType,
            entityId,
            status: "open",
          },
        });
        if (!open) {
          await ctx.prisma.alertInstance.create({
            data: {
              userId: ctx.userId!,
              ruleId,
              entityType,
              entityId,
              payload: payload || null,
            },
          });
        }
      }

      for (const r of rules) {
        if (r.module === "breeding" && r.condition === "to_palpate_30_60") {
          const records = await ctx.prisma.breedingRecord.findMany({
            where: { userId: ctx.userId!, eventDate: { gte: since } },
            select: { animalId: true, eventType: true, eventDate: true },
            orderBy: { eventDate: "asc" },
          });
          const palps = await ctx.prisma.palpationRecord.findMany({
            where: { userId: ctx.userId! },
            select: { animalId: true, palpationDate: true, result: true },
          });
          const palpsByAnimal = new Map<
            string,
            { date: Date; result: string }[]
          >();
          palps.forEach((p) => {
            const arr = palpsByAnimal.get(p.animalId) || [];
            arr.push({ date: p.palpationDate, result: p.result });
            palpsByAnimal.set(p.animalId, arr);
          });
          const byAnimal = new Map<string, { type: string; date: Date }[]>();
          records.forEach((e) => {
            const arr = byAnimal.get(e.animalId) || [];
            arr.push({ type: e.eventType, date: e.eventDate });
            byAnimal.set(e.animalId, arr);
          });
          for (const [animalId, events] of byAnimal) {
            events.sort((a, b) => a.date.getTime() - b.date.getTime());
            const lastService = [...events]
              .reverse()
              .find(
                (e) => e.type === "insemination" || e.type === "embryo_transfer"
              );
            if (lastService) {
              const days =
                (now.getTime() - lastService.date.getTime()) / 86400000;
              if (days >= 30 && days <= 60) {
                const palpsAfter = (palpsByAnimal.get(animalId) || []).filter(
                  (p) => p.date > lastService.date
                );
                const hasConfirmed = palpsAfter.some(
                  (p) => (p.result || "").toLowerCase() === "pregnant"
                );
                if (!hasConfirmed)
                  await createIfNotExists(r.id, "animal", animalId);
              }
            }
          }
        }
        if (r.module === "breeding" && r.condition === "unscheduled_heat") {
          const records = await ctx.prisma.breedingRecord.findMany({
            where: { userId: ctx.userId!, eventDate: { gte: since } },
            select: { animalId: true, eventType: true, eventDate: true },
            orderBy: { eventDate: "asc" },
          });
          const byAnimal = new Map<string, { type: string; date: Date }[]>();
          records.forEach((e) => {
            const arr = byAnimal.get(e.animalId) || [];
            arr.push({ type: e.eventType, date: e.eventDate });
            byAnimal.set(e.animalId, arr);
          });
          for (const [animalId, events] of byAnimal) {
            events.sort((a, b) => a.date.getTime() - b.date.getTime());
            const lastHeat = [...events]
              .reverse()
              .find((e) => e.type === "heat");
            if (lastHeat) {
              const afterService = events.find(
                (e) =>
                  e.date > lastHeat.date &&
                  (e.type === "insemination" || e.type === "embryo_transfer")
              );
              const days = (now.getTime() - lastHeat.date.getTime()) / 86400000;
              if (!afterService && days <= 21)
                await createIfNotExists(r.id, "animal", animalId);
            }
          }
        }
        if (r.module === "milk" && r.condition === "ccs_gt_400k") {
          const rows = await ctx.prisma.milkRecord.findMany({
            where: { userId: ctx.userId!, recordedAt: { gte: since } },
            select: { animalId: true, ccs: true },
          });
          const map = new Map<string, { sum: number; count: number }>();
          rows.forEach((m) => {
            if (!m.animalId || !m.ccs) return;
            const x = map.get(m.animalId) || { sum: 0, count: 0 };
            x.sum += m.ccs;
            x.count += 1;
            map.set(m.animalId, x);
          });
          for (const [animalId, v] of map.entries()) {
            const avg = v.sum / Math.max(1, v.count);
            if (avg > 400000)
              await createIfNotExists(
                r.id,
                "animal",
                animalId,
                JSON.stringify({ avgCCS: avg })
              );
          }
        }
        if (
          r.module === "health" &&
          r.condition === "health_next_due_overdue"
        ) {
          const list = await ctx.prisma.healthRecord.findMany({
            where: {
              user: { clerkId: ctx.userId! },
              nextDueDate: { lte: now },
            },
            select: { id: true },
          });
          for (const rec of list)
            await createIfNotExists(r.id, "healthRecord", rec.id);
        }
        if (r.module === "inventory" && r.condition === "stock_below_min") {
          const products = await ctx.prisma.product.findMany({
            where: { user: { clerkId: ctx.userId! } },
            select: { id: true, minStock: true },
          });
          const moves = await ctx.prisma.stockMovement.findMany({
            where: { user: { clerkId: ctx.userId! } },
            select: { productId: true, type: true, quantity: true },
          });
          const stock = new Map<string, number>();
          moves.forEach((m) => {
            const s = stock.get(m.productId) || 0;
            const q =
              m.type === "in" ? m.quantity : m.type === "out" ? -m.quantity : 0;
            stock.set(m.productId, s + q);
          });
          for (const p of products) {
            const current = stock.get(p.id) || 0;
            const min = p.minStock || 0;
            if (min > 0 && current < min)
              await createIfNotExists(
                r.id,
                "product",
                p.id,
                JSON.stringify({ current, min })
              );
          }
        }
      }
      return { ok: true };
    }),
  listInstances: protectedProcedure
    .input(
      z
        .object({
          status: z.string().optional(),
          limit: z.number().min(1).max(200).default(100),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const where: any = { userId: ctx.userId! };
      if (input?.status) where.status = input.status;
      return ctx.prisma.alertInstance.findMany({
        where,
        orderBy: { triggeredAt: "desc" },
        take: input?.limit ?? 100,
        include: { rule: true },
      });
    }),
  updateInstance: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["open", "acknowledged", "resolved"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.alertInstance.update({
        where: { id: input.id },
        data: { status: input.status },
      });
    }),
});
