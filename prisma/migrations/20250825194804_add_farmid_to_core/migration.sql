/*
  Warnings:

  - A unique constraint covering the columns `[farmId,tagNumber]` on the table `Animal` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `farmId` to the `Animal` table without a default value. This is not possible if the table is not empty.
  - Added the required column `farmId` to the `MilkRecord` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Animal" ADD COLUMN     "farmId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "public"."MilkRecord" ADD COLUMN     "farmId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "public"."Farm" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "ownerName" TEXT,
    "address" TEXT,
    "directions" TEXT,
    "officialNumber" TEXT,
    "phone" TEXT,
    "ranchPhone" TEXT,
    "nit" TEXT,
    "breederName" TEXT,
    "startDate" TIMESTAMP(3),
    "lastDataEntryAt" TIMESTAMP(3),
    "lastVisitAt" TIMESTAMP(3),
    "maleCount" INTEGER NOT NULL DEFAULT 0,
    "femaleCount" INTEGER NOT NULL DEFAULT 0,
    "uggValue" DOUBLE PRECISION,
    "uggLots" DOUBLE PRECISION,
    "uggTotal" DOUBLE PRECISION,
    "uggAsOf" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Farm_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Farm_orgId_idx" ON "public"."Farm"("orgId");

-- CreateIndex
CREATE INDEX "Farm_code_idx" ON "public"."Farm"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Farm_orgId_code_key" ON "public"."Farm"("orgId", "code");

-- CreateIndex
CREATE INDEX "Animal_farmId_idx" ON "public"."Animal"("farmId");

-- CreateIndex
CREATE UNIQUE INDEX "Animal_farmId_tagNumber_key" ON "public"."Animal"("farmId", "tagNumber");

-- CreateIndex
CREATE INDEX "MilkRecord_farmId_idx" ON "public"."MilkRecord"("farmId");

-- AddForeignKey
ALTER TABLE "public"."Animal" ADD CONSTRAINT "Animal_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "public"."Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MilkRecord" ADD CONSTRAINT "MilkRecord_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "public"."Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Farm" ADD CONSTRAINT "Farm_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Farm" ADD CONSTRAINT "Farm_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
