-- AlterTable
ALTER TABLE "public"."Device" ADD COLUMN     "hasPasscode" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "resetCode" TEXT,
ADD COLUMN     "resetCodeExpiresAt" TIMESTAMP(3);
