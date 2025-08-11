-- CreateTable
CREATE TABLE "public"."AIUserProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bio" TEXT,
    "preferences" TEXT,
    "goals" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIUserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AIMemory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "importance" INTEGER NOT NULL DEFAULT 1,
    "tags" TEXT,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "AIMemory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AIUserProfile_userId_key" ON "public"."AIUserProfile"("userId");

-- CreateIndex
CREATE INDEX "AIUserProfile_userId_idx" ON "public"."AIUserProfile"("userId");

-- CreateIndex
CREATE INDEX "AIMemory_userId_importance_idx" ON "public"."AIMemory"("userId", "importance");

-- CreateIndex
CREATE INDEX "AIMemory_createdAt_idx" ON "public"."AIMemory"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."AIUserProfile" ADD CONSTRAINT "AIUserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AIMemory" ADD CONSTRAINT "AIMemory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
