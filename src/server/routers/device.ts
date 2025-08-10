import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";

export const deviceRouter = createTRPCRouter({
  register: protectedProcedure
    .input(
      z.object({
        deviceId: z.string(),
        name: z.string().optional(),
        platform: z.string().optional(),
        orgId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const clerkId = ctx.userId!;
      const me = await prisma.user.findUnique({ where: { clerkId } });
      if (!me) throw new Error("Usuario no encontrado");

      // If orgId provided, verify membership
      if (input.orgId) {
        const membership = await prisma.organizationMembership.findFirst({
          where: { orgId: input.orgId, userId: me.id },
        });
        if (!membership) throw new Error("No perteneces a esa organización");
      }

      const device = await prisma.device.upsert({
        where: { deviceId: input.deviceId },
        update: {
          name: input.name,
          platform: input.platform,
          userId: me.id,
          orgId: input.orgId ?? undefined,
        },
        create: {
          deviceId: input.deviceId,
          name: input.name,
          platform: input.platform,
          userId: me.id,
          orgId: input.orgId ?? undefined,
        },
      });
      return { id: device.id };
    }),

  myDevices: protectedProcedure.query(async ({ ctx }) => {
    const me = await prisma.user.findUnique({
      where: { clerkId: ctx.userId! },
    });
    if (!me) return [];
    const devices = await prisma.device.findMany({
      where: { userId: me.id },
      orderBy: { updatedAt: "desc" },
    });
    return devices.map((d) => ({
      id: d.id,
      deviceId: d.deviceId,
      name: d.name,
      platform: d.platform,
      orgId: d.orgId,
    }));
  }),

  rebind: protectedProcedure
    .input(
      z.object({
        deviceId: z.string(),
        targetUserEmail: z.string().email(),
        targetOrgId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Only admins can rebind
      const me = await prisma.user.findUnique({
        where: { clerkId: ctx.userId! },
      });
      if (!me) throw new Error("Usuario no encontrado");
      const device = await prisma.device.findUnique({
        where: { deviceId: input.deviceId },
      });
      if (!device) throw new Error("Dispositivo no encontrado");

      // Admin check: must be admin of current org binding or creator of org
      if (device.orgId) {
        const admin = await prisma.organizationMembership.findFirst({
          where: { orgId: device.orgId, userId: me.id, role: "ADMIN" },
        });
        if (!admin) throw new Error("No autorizado");
      } else {
        // If device not bound to org, only device owner can rebind
        if (device.userId !== me.id) throw new Error("No autorizado");
      }

      const targetUser = await prisma.user.findUnique({
        where: { email: input.targetUserEmail },
      });
      if (!targetUser) throw new Error("Usuario destino no encontrado");
      if (input.targetOrgId) {
        const membership = await prisma.organizationMembership.findFirst({
          where: { orgId: input.targetOrgId, userId: targetUser.id },
        });
        if (!membership)
          throw new Error("El usuario destino no pertenece a esa organización");
      }

      await prisma.device.update({
        where: { deviceId: input.deviceId },
        data: { userId: targetUser.id, orgId: input.targetOrgId ?? null },
      });
      return { success: true };
    }),
});
