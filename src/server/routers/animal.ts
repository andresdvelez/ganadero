import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { generateTagNumber } from "@/lib/utils";

export const animalRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    // Garantiza que exista el usuario (útil en dev con ALLOW_DEV_UNAUTH)
    const user = await ctx.prisma.user.upsert({
      where: { clerkId: ctx.userId },
      update: {},
      create: {
        clerkId: ctx.userId,
        email: `user_${ctx.userId}@ganado.ai`,
      },
      include: { animals: { orderBy: { createdAt: "desc" } } },
    });
    return user.animals;
  }),

  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const animal = await ctx.prisma.animal.findFirst({
        where: {
          id: input.id,
          user: { clerkId: ctx.userId },
        },
        include: {
          healthRecords: {
            orderBy: { performedAt: "desc" },
            take: 5,
          },
          breedingRecords: {
            orderBy: { eventDate: "desc" },
            take: 5,
          },
          mother: true,
          father: true,
        },
      });

      if (!animal) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Animal not found" });
      }

      return animal;
    }),

  getTree: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const base = await ctx.prisma.animal.findFirst({
        where: { id: input.id, user: { clerkId: ctx.userId } },
        include: {
          mother: true,
          father: true,
          motherChildren: { take: 10, orderBy: { createdAt: "desc" } },
          fatherChildren: { take: 10, orderBy: { createdAt: "desc" } },
        },
      });
      if (!base) throw new TRPCError({ code: "NOT_FOUND" });
      return base;
    }),

  getSireInseminations: protectedProcedure
    .input(
      z.object({
        bullId: z.string(),
        limit: z.number().min(1).max(200).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const bull = await ctx.prisma.animal.findFirst({
        where: { id: input.bullId, user: { clerkId: ctx.userId } },
      });
      if (!bull) throw new TRPCError({ code: "NOT_FOUND" });
      const services = await ctx.prisma.breedingRecord.findMany({
        where: { sireId: input.bullId, user: { clerkId: ctx.userId } as any },
        orderBy: { eventDate: "desc" },
        take: input.limit,
        include: { animal: true },
      });
      return { bull, services };
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        species: z.string().default("cattle"),
        breed: z.string().optional(),
        sex: z.enum(["male", "female"]),
        birthDate: z.date().optional(),
        weight: z.number().optional(),
        color: z.string().optional(),
        motherId: z.string().optional(),
        fatherId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.upsert({
        where: { clerkId: ctx.userId },
        update: {},
        create: {
          clerkId: ctx.userId,
          email: `user_${ctx.userId}@ganado.ai`,
        },
      });

      return await ctx.prisma.animal.create({
        data: {
          ...input,
          tagNumber: generateTagNumber(),
          userId: user.id,
        },
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        breed: z.string().optional(),
        weight: z.number().optional(),
        color: z.string().optional(),
        status: z.enum(["active", "sold", "deceased"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const animal = await ctx.prisma.animal.findFirst({
        where: {
          id,
          user: { clerkId: ctx.userId },
        },
      });

      if (!animal) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Animal not found" });
      }

      return await ctx.prisma.animal.update({
        where: { id },
        data,
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const animal = await ctx.prisma.animal.findFirst({
        where: {
          id: input.id,
          user: { clerkId: ctx.userId },
        },
      });

      if (!animal) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Animal not found" });
      }

      return await ctx.prisma.animal.delete({
        where: { id: input.id },
      });
    }),
});
