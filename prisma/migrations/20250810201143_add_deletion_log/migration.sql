-- CreateTable
CREATE TABLE "public"."DeletionLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeletionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeletionLog_userId_idx" ON "public"."DeletionLog"("userId");

-- CreateIndex
CREATE INDEX "DeletionLog_entityType_entityId_idx" ON "public"."DeletionLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "DeletionLog_deletedAt_idx" ON "public"."DeletionLog"("deletedAt");

-- AddForeignKey
ALTER TABLE "public"."DeletionLog" ADD CONSTRAINT "DeletionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
