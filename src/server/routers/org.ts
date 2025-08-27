import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";
import { clerkClient } from "@clerk/nextjs/server";

export const orgRouter = createTRPCRouter({
  myOrganizations: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.userId!;
    const me = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!me) return [];
    const memberships = await prisma.organizationMembership.findMany({
      where: { userId: me.id },
      include: { organization: true },
    });
    return memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      role: m.role,
    }));
  }),

  createOrganization: protectedProcedure
    .input(z.object({ name: z.string().min(2).max(100) }))
    .mutation(async ({ ctx, input }) => {
      const clerkId = ctx.userId!;
      let me = await prisma.user.findUnique({ where: { clerkId } });
      if (!me) {
        try {
          // En este entorno clerkClient es una función que devuelve el cliente
          const client = await clerkClient();
          const user = await client.users.getUser(clerkId);
          const primaryEmailId = user.primaryEmailAddressId;
          const emailFromPrimary = user.emailAddresses?.find(
            (e) => e.id === primaryEmailId
          )?.emailAddress;
          const fallbackEmail = user.emailAddresses?.[0]?.emailAddress;
          const email =
            emailFromPrimary || fallbackEmail || `user_${clerkId}@ganado.ai`;
          const fullName =
            [user.firstName, user.lastName].filter(Boolean).join(" ") || null;
          me = await prisma.user.create({
            data: {
              clerkId,
              email,
              name: fullName,
            },
          });
        } catch (e: any) {
          const hint =
            (e && (e.message || e.toString())) || "Fallo al consultar Clerk";
          throw new Error(
            `Usuario no encontrado (auth). Verifica sesión de Clerk o token. Detalle: ${hint}`
          );
        }
      }
      const org = await prisma.organization.create({
        data: {
          name: input.name,
          createdByUserId: me.id,
          memberships: {
            create: {
              userId: me.id,
              role: "ADMIN",
            },
          },
        },
      });
      return { id: org.id, name: org.name };
    }),

  listMembers: protectedProcedure
    .input(z.object({ orgId: z.string() }))
    .query(async ({ ctx, input }) => {
      const clerkId = ctx.userId!;
      const me = await prisma.user.findUnique({ where: { clerkId } });
      if (!me) throw new Error("Usuario no encontrado");
      const admin = await prisma.organizationMembership.findFirst({
        where: { orgId: input.orgId, userId: me.id, role: "ADMIN" },
      });
      if (!admin) throw new Error("No autorizado");
      const members = await prisma.organizationMembership.findMany({
        where: { orgId: input.orgId },
        include: { user: true },
      });
      return members.map((m) => ({
        id: m.id,
        role: m.role,
        user: { id: m.user.id, email: m.user.email, name: m.user.name },
      }));
    }),

  addMemberWithPasscode: protectedProcedure
    .input(
      z.object({
        orgId: z.string(),
        email: z.string().email(),
        name: z.string().min(1),
        role: z.enum(["ADMIN", "MEMBER"]).default("MEMBER"),
        passcode: z.string().min(6),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const clerkId = ctx.userId!;
      const me = await prisma.user.findUnique({ where: { clerkId } });
      if (!me) throw new Error("Usuario no encontrado");
      const admin = await prisma.organizationMembership.findFirst({
        where: { orgId: input.orgId, userId: me.id, role: "ADMIN" },
      });
      if (!admin) throw new Error("No autorizado");

      // Ensure or create user record (email acts as unique identifier)
      let user = await prisma.user.findUnique({
        where: { email: input.email },
      });
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: input.email,
            name: input.name,
            clerkId: `pending-${Date.now()}-${Math.random()
              .toString(36)
              .slice(2)}`,
          },
        });
      }

      // Add membership
      await prisma.organizationMembership.upsert({
        where: { orgId_userId: { orgId: input.orgId, userId: user.id } },
        update: { role: input.role as any },
        create: {
          orgId: input.orgId,
          userId: user.id,
          role: input.role as any,
        },
      });

      // Return a bootstrap payload for provisioning on the device (admin will share it securely)
      return {
        bootstrap: {
          email: user.email,
          name: user.name,
          orgId: input.orgId,
          role: input.role,
          passcode: input.passcode,
        },
      };
    }),
});
