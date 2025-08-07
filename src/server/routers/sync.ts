import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const syncRouter = createTRPCRouter({
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
      const existing = await ctx.prisma.healthRecord.findFirst({
        where: { externalId },
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
      const existing = await ctx.prisma.breedingRecord.findFirst({
        where: { externalId },
      });
      const saved = existing
        ? await ctx.prisma.breedingRecord.update({
            where: { id: existing.id },
            data: payload,
          })
        : await ctx.prisma.breedingRecord.create({ data: payload });
      return saved;
    }),
});
