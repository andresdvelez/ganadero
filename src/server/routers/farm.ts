import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";

const farmInput = z.object({
  orgId: z.string(),
  code: z.string().min(1).max(32),
  name: z.string().min(1),
  location: z.string().optional(),
  ownerName: z.string().optional(),
  address: z.string().optional(),
  directions: z.string().optional(),
  officialNumber: z.string().optional(),
  phone: z.string().optional(),
  ranchPhone: z.string().optional(),
  nit: z.string().optional(),
  breederName: z.string().optional(),
  startDate: z.date().optional(),
  lastDataEntryAt: z.date().optional(),
  lastVisitAt: z.date().optional(),
  maleCount: z.number().int().nonnegative().default(0),
  femaleCount: z.number().int().nonnegative().default(0),
  uggAsOf: z.date().optional(),
});

export const farmRouter = createTRPCRouter({
  getAll: protectedProcedure
    .query(async ({ ctx }) => {
      const me = await prisma.user.findUnique({
        where: { clerkId: ctx.userId! },
      });
      if (!me) throw new Error("Usuario no encontrado");
      
      const memberships = await prisma.organizationMembership.findMany({
        where: { userId: me.id },
        select: { orgId: true },
      });
      
      const orgIds = memberships.map(m => m.orgId);
      
      return prisma.farm.findMany({
        where: { orgId: { in: orgIds } },
        orderBy: { createdAt: "desc" },
      });
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const me = await prisma.user.findUnique({
        where: { clerkId: ctx.userId! },
      });
      if (!me) throw new Error("Usuario no encontrado");
      
      const farm = await prisma.farm.findUnique({ 
        where: { id: input.id } 
      });
      
      if (!farm) throw new Error("Finca no encontrada");
      
      const membership = await prisma.organizationMembership.findFirst({
        where: { orgId: farm.orgId, userId: me.id },
      });
      if (!membership) throw new Error("No perteneces a esa organización");
      
      return farm;
    }),

  list: protectedProcedure
    .input(z.object({ orgId: z.string() }))
    .query(async ({ ctx, input }) => {
      const me = await prisma.user.findUnique({
        where: { clerkId: ctx.userId! },
      });
      if (!me) throw new Error("Usuario no encontrado");
      const membership = await prisma.organizationMembership.findFirst({
        where: { orgId: input.orgId, userId: me.id },
      });
      if (!membership) throw new Error("No perteneces a esa organización");
      return prisma.farm.findMany({
        where: { orgId: input.orgId },
        orderBy: { createdAt: "desc" },
      });
    }),

  create: protectedProcedure
    .input(farmInput)
    .mutation(async ({ ctx, input }) => {
      const me = await prisma.user.findUnique({
        where: { clerkId: ctx.userId! },
      });
      if (!me) throw new Error("Usuario no encontrado");
      const membership = await prisma.organizationMembership.findFirst({
        where: { orgId: input.orgId, userId: me.id },
      });
      if (!membership || (membership as any).role !== "ADMIN")
        throw new Error("Solo ADMIN puede crear fincas en esta organización");

      try {
        const u = await prisma.farm.create({
          data: {
            orgId: input.orgId,
            createdByUserId: me.id,
            code: input.code,
            name: input.name,
            location: input.location,
            ownerName: input.ownerName,
            address: input.address,
            directions: input.directions,
            officialNumber: input.officialNumber,
            phone: input.phone,
            ranchPhone: input.ranchPhone,
            nit: input.nit,
            breederName: input.breederName,
            startDate: input.startDate,
            lastDataEntryAt: input.lastDataEntryAt,
            lastVisitAt: input.lastVisitAt,
            maleCount: input.maleCount ?? 0,
            femaleCount: input.femaleCount ?? 0,
            uggAsOf: input.uggAsOf,
          },
        });
        return u;
      } catch (e: any) {
        const msg = e?.message || "";
        if (
          /does not exist/i.test(msg) ||
          /relation .* does not exist/i.test(msg)
        ) {
          throw new Error(
            "Faltan migraciones en la base de datos. Ejecuta 'prisma migrate deploy' (o 'prisma db push') y reintenta."
          );
        }
        throw e;
      }
    }),

  update: protectedProcedure
    .input(farmInput.extend({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const me = await prisma.user.findUnique({
        where: { clerkId: ctx.userId! },
      });
      if (!me) throw new Error("Usuario no encontrado");
      const exists = await prisma.farm.findUnique({ where: { id: input.id } });
      if (!exists) throw new Error("Finca no encontrada");
      const membership = await prisma.organizationMembership.findFirst({
        where: { orgId: exists.orgId, userId: me.id },
      });
      if (!membership || (membership as any).role !== "ADMIN")
        throw new Error("Solo ADMIN puede editar fincas en esta organización");
      return prisma.farm.update({
        where: { id: input.id },
        data: {
          code: input.code,
          name: input.name,
          location: input.location,
          ownerName: input.ownerName,
          address: input.address,
          directions: input.directions,
          officialNumber: input.officialNumber,
          phone: input.phone,
          ranchPhone: input.ranchPhone,
          nit: input.nit,
          breederName: input.breederName,
          startDate: input.startDate,
          lastDataEntryAt: input.lastDataEntryAt,
          lastVisitAt: input.lastVisitAt,
          maleCount: input.maleCount ?? 0,
          femaleCount: input.femaleCount ?? 0,
          uggAsOf: input.uggAsOf,
        },
      });
    }),

  calcUGG: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        // pesos relativos configurables
        weightMale: z.number().default(1.0),
        weightFemale: z.number().default(1.0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const me = await prisma.user.findUnique({
        where: { clerkId: ctx.userId! },
      });
      if (!me) throw new Error("Usuario no encontrado");
      const farm = await prisma.farm.findUnique({ where: { id: input.id } });
      if (!farm) throw new Error("Finca no encontrada");
      const membership = await prisma.organizationMembership.findFirst({
        where: { orgId: farm.orgId, userId: me.id },
      });
      if (!membership) throw new Error("No perteneces a esa organización");
      const ugg =
        (farm.maleCount || 0) * input.weightMale +
        (farm.femaleCount || 0) * input.weightFemale;
      return prisma.farm.update({
        where: { id: farm.id },
        data: { uggValue: ugg, uggTotal: ugg, uggAsOf: new Date() },
      });
    }),
});
