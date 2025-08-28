/*
  Warnings:

  - A unique constraint covering the columns `[farmId,tagNumber]` on the table `Animal` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `farmId` to the `Animal` table without a default value. This is not possible if the table is not empty.
  - Added the required column `farmId` to the `MilkRecord` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."Animal" ADD COLUMN     "farmId" TEXT;

-- AlterTable
ALTER TABLE "public"."MilkRecord" ADD COLUMN     "farmId" TEXT;

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

-- Foreign keys for Farm
ALTER TABLE "public"."Farm" ADD CONSTRAINT "Farm_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."Farm" ADD CONSTRAINT "Farm_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: create a default Farm per existing user/org if needed, and attach existing rows
DO $$
DECLARE
  rec RECORD;
  default_farm_id TEXT;
  org_for_user TEXT;
BEGIN
  -- Create a fallback farm per user (without org tie if unknown)
  FOR rec IN SELECT DISTINCT "userId" FROM "public"."Animal" WHERE "farmId" IS NULL LOOP
    -- try find an org for user
    SELECT "organizationId" INTO org_for_user FROM "public"."OrganizationMembership" WHERE "userId" = rec."userId" LIMIT 1;
    default_farm_id := gen_random_uuid();
    INSERT INTO "public"."Farm" ("id","orgId","createdByUserId","code","name","createdAt","updatedAt")
    VALUES (default_farm_id, COALESCE(org_for_user, 'orphan-org'), rec."userId", 'DF-'||substr(default_farm_id,1,6), 'Finca por defecto', now(), now())
    ON CONFLICT DO NOTHING;
    UPDATE "public"."Animal" SET "farmId" = default_farm_id WHERE "userId" = rec."userId" AND "farmId" IS NULL;
  END LOOP;

  -- For milk records without farmId, inherit from animal if available; otherwise assign any default farm for the same user
  UPDATE "public"."MilkRecord" mr
  SET "farmId" = a."farmId"
  FROM "public"."Animal" a
  WHERE mr."animalId" = a."id" AND mr."farmId" IS NULL;

  FOR rec IN SELECT DISTINCT "userId" FROM "public"."MilkRecord" WHERE "farmId" IS NULL LOOP
    SELECT f."id" INTO default_farm_id FROM "public"."Farm" f JOIN "public"."User" u ON f."createdByUserId" = u."id" WHERE u."id" = rec."userId" LIMIT 1;
    IF default_farm_id IS NOT NULL THEN
      UPDATE "public"."MilkRecord" SET "farmId" = default_farm_id WHERE "userId" = rec."userId" AND "farmId" IS NULL;
    END IF;
  END LOOP;
END$$;

-- Now enforce NOT NULL and add FKs
ALTER TABLE "public"."Animal" ALTER COLUMN "farmId" SET NOT NULL;
ALTER TABLE "public"."MilkRecord" ALTER COLUMN "farmId" SET NOT NULL;

ALTER TABLE "public"."Animal" ADD CONSTRAINT "Animal_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "public"."Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "public"."MilkRecord" ADD CONSTRAINT "MilkRecord_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "public"."Farm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
