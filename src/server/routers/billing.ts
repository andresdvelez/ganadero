import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";

export const billingRouter = createTRPCRouter({
  listPlans: protectedProcedure.query(async () => {
    const plans = await prisma.plan.findMany({ where: { isActive: true } });
    const addons = await prisma.addon.findMany({ where: { isActive: true } });
    return { plans, addons };
  }),

  getSubscription: protectedProcedure
    .input(z.object({ orgId: z.string() }))
    .query(async ({ input }) => {
      const sub = await prisma.subscription.findFirst({
        where: { orgId: input.orgId, status: { in: ["ACTIVE", "PAST_DUE", "PENDING"] as any } },
        orderBy: { createdAt: "desc" },
      });
      const usage = await prisma.orgUsage.findUnique({ where: { orgId: input.orgId } });
      return { sub, usage };
    }),

  createPreference: protectedProcedure
    .input(z.object({
      orgId: z.string(),
      period: z.enum(["MONTHLY", "ANNUAL"]),
      qtyUsers: z.number().min(1).default(1),
      qtyDevices: z.number().min(1).default(1),
    }))
    .mutation(async ({ ctx, input }) => {
      // Load base plan and addons
      const planKey = input.period === "ANNUAL" ? "licencia_anual" : "licencia_mensual";
      const plan = await prisma.plan.findFirst({ where: { key: planKey, isActive: true } });
      if (!plan) throw new Error("Plan no disponible");

      const addonUser = await prisma.addon.findFirst({ where: { key: "user_extra", isActive: true } });
      const addonDevice = await prisma.addon.findFirst({ where: { key: "device_extra", isActive: true } });

      const basePrice = plan.priceCop; // cents COP
      const usersExtra = Math.max(0, input.qtyUsers - 1);
      const devicesExtra = Math.max(0, input.qtyDevices - 1);
      const usersPrice = usersExtra * (addonUser?.priceCop || 0);
      const devicesPrice = devicesExtra * (addonDevice?.priceCop || 0);
      const total = basePrice + usersPrice + devicesPrice;

      const accessToken = process.env.MP_ACCESS_TOKEN;
      const backUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://app.ganado.co";
      if (!accessToken) throw new Error("Mercado Pago no configurado");

      const body = {
        items: [
          { title: `Licencia Ganado AI (${input.period})`, quantity: 1, currency_id: "COP", unit_price: total / 100 },
        ],
        back_urls: {
          success: `${backUrl}/settings/plan?status=success`,
          failure: `${backUrl}/settings/plan?status=failure`,
          pending: `${backUrl}/settings/plan?status=pending`,
        },
        auto_return: "approved",
        metadata: {
          orgId: input.orgId,
          planKey,
          qtyUsers: input.qtyUsers,
          qtyDevices: input.qtyDevices,
          period: input.period,
          userId: ctx.userId,
        },
        notification_url: `${backUrl}/api/mercadopago/webhook`,
      } as any;

      const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Error creando preferencia: ${txt}`);
      }
      const pref = await res.json();
      // Create pending subscription record
      await prisma.subscription.create({
        data: {
          orgId: input.orgId,
          userId: ctx.userId!,
          provider: "MERCADO_PAGO" as any,
          providerRef: pref.id,
          status: "PENDING" as any,
          period: input.period as any,
          planKey,
          qtyUsers: input.qtyUsers,
          qtyDevices: input.qtyDevices,
          raw: JSON.stringify(pref),
        },
      });
      return { id: pref.id, init_point: pref.init_point, sandbox_init_point: pref.sandbox_init_point };
    }),
});


