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
