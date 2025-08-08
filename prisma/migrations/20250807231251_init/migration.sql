-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "ranchName" TEXT,
    "location" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/Denver',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Animal" (
    "id" TEXT NOT NULL,
    "externalId" TEXT,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tagNumber" TEXT NOT NULL,
    "species" TEXT NOT NULL DEFAULT 'cattle',
    "breed" TEXT,
    "sex" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3),
    "weight" DOUBLE PRECISION,
    "color" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "motherId" TEXT,
    "fatherId" TEXT,
    "imageUrl" TEXT,
    "metadata" TEXT,
    "qrCode" TEXT,
    "nfcId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Animal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."HealthRecord" (
    "id" TEXT NOT NULL,
    "externalId" TEXT,
    "userId" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "medication" TEXT,
    "dosage" TEXT,
    "veterinarian" TEXT,
    "cost" DOUBLE PRECISION,
    "notes" TEXT,
    "performedAt" TIMESTAMP(3) NOT NULL,
    "nextDueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BreedingRecord" (
    "id" TEXT NOT NULL,
    "externalId" TEXT,
    "userId" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "sireId" TEXT,
    "inseminationType" TEXT,
    "pregnancyStatus" TEXT,
    "expectedDueDate" TIMESTAMP(3),
    "actualBirthDate" TIMESTAMP(3),
    "offspringCount" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BreedingRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ModuleRegistry" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "isCore" BOOLEAN NOT NULL DEFAULT false,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "config" TEXT,
    "aiPrompts" TEXT,
    "permissions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModuleRegistry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserModule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "customConfig" TEXT,
    "lastUsed" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Product" (
    "id" TEXT NOT NULL,
    "externalId" TEXT,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "unit" TEXT NOT NULL,
    "minStock" DOUBLE PRECISION,
    "currentStock" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "cost" DOUBLE PRECISION,
    "supplier" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."StockMovement" (
    "id" TEXT NOT NULL,
    "externalId" TEXT,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitCost" DOUBLE PRECISION,
    "reason" TEXT,
    "relatedEntity" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MilkRecord" (
    "id" TEXT NOT NULL,
    "externalId" TEXT,
    "userId" TEXT NOT NULL,
    "animalId" TEXT,
    "session" TEXT NOT NULL,
    "liters" DOUBLE PRECISION NOT NULL,
    "fatPct" DOUBLE PRECISION,
    "proteinPct" DOUBLE PRECISION,
    "ccs" DOUBLE PRECISION,
    "notes" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MilkRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Pasture" (
    "id" TEXT NOT NULL,
    "externalId" TEXT,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "areaHa" DOUBLE PRECISION,
    "currentGroup" TEXT,
    "occupancySince" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pasture_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LabExam" (
    "id" TEXT NOT NULL,
    "externalId" TEXT,
    "userId" TEXT NOT NULL,
    "animalId" TEXT,
    "examType" TEXT NOT NULL,
    "sampleType" TEXT,
    "labName" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL,
    "resultAt" TIMESTAMP(3),
    "result" TEXT,
    "antibiogram" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabExam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SyncQueue" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "syncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyncQueue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AIConversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "moduleContext" TEXT,
    "metadata" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIConversation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkId_key" ON "public"."User"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "User_clerkId_idx" ON "public"."User"("clerkId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Animal_externalId_key" ON "public"."Animal"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Animal_tagNumber_key" ON "public"."Animal"("tagNumber");

-- CreateIndex
CREATE INDEX "Animal_userId_idx" ON "public"."Animal"("userId");

-- CreateIndex
CREATE INDEX "Animal_tagNumber_idx" ON "public"."Animal"("tagNumber");

-- CreateIndex
CREATE INDEX "Animal_status_idx" ON "public"."Animal"("status");

-- CreateIndex
CREATE UNIQUE INDEX "HealthRecord_externalId_key" ON "public"."HealthRecord"("externalId");

-- CreateIndex
CREATE INDEX "HealthRecord_userId_idx" ON "public"."HealthRecord"("userId");

-- CreateIndex
CREATE INDEX "HealthRecord_animalId_idx" ON "public"."HealthRecord"("animalId");

-- CreateIndex
CREATE INDEX "HealthRecord_type_idx" ON "public"."HealthRecord"("type");

-- CreateIndex
CREATE INDEX "HealthRecord_performedAt_idx" ON "public"."HealthRecord"("performedAt");

-- CreateIndex
CREATE UNIQUE INDEX "BreedingRecord_externalId_key" ON "public"."BreedingRecord"("externalId");

-- CreateIndex
CREATE INDEX "BreedingRecord_userId_idx" ON "public"."BreedingRecord"("userId");

-- CreateIndex
CREATE INDEX "BreedingRecord_animalId_idx" ON "public"."BreedingRecord"("animalId");

-- CreateIndex
CREATE INDEX "BreedingRecord_eventType_idx" ON "public"."BreedingRecord"("eventType");

-- CreateIndex
CREATE INDEX "BreedingRecord_eventDate_idx" ON "public"."BreedingRecord"("eventDate");

-- CreateIndex
CREATE UNIQUE INDEX "ModuleRegistry_name_key" ON "public"."ModuleRegistry"("name");

-- CreateIndex
CREATE INDEX "ModuleRegistry_category_idx" ON "public"."ModuleRegistry"("category");

-- CreateIndex
CREATE INDEX "ModuleRegistry_isEnabled_idx" ON "public"."ModuleRegistry"("isEnabled");

-- CreateIndex
CREATE INDEX "UserModule_userId_idx" ON "public"."UserModule"("userId");

-- CreateIndex
CREATE INDEX "UserModule_moduleId_idx" ON "public"."UserModule"("moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "UserModule_userId_moduleId_key" ON "public"."UserModule"("userId", "moduleId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_externalId_key" ON "public"."Product"("externalId");

-- CreateIndex
CREATE INDEX "Product_userId_idx" ON "public"."Product"("userId");

-- CreateIndex
CREATE INDEX "Product_code_idx" ON "public"."Product"("code");

-- CreateIndex
CREATE UNIQUE INDEX "StockMovement_externalId_key" ON "public"."StockMovement"("externalId");

-- CreateIndex
CREATE INDEX "StockMovement_userId_idx" ON "public"."StockMovement"("userId");

-- CreateIndex
CREATE INDEX "StockMovement_productId_idx" ON "public"."StockMovement"("productId");

-- CreateIndex
CREATE INDEX "StockMovement_occurredAt_idx" ON "public"."StockMovement"("occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "MilkRecord_externalId_key" ON "public"."MilkRecord"("externalId");

-- CreateIndex
CREATE INDEX "MilkRecord_userId_idx" ON "public"."MilkRecord"("userId");

-- CreateIndex
CREATE INDEX "MilkRecord_animalId_idx" ON "public"."MilkRecord"("animalId");

-- CreateIndex
CREATE INDEX "MilkRecord_recordedAt_idx" ON "public"."MilkRecord"("recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Pasture_externalId_key" ON "public"."Pasture"("externalId");

-- CreateIndex
CREATE INDEX "Pasture_userId_idx" ON "public"."Pasture"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LabExam_externalId_key" ON "public"."LabExam"("externalId");

-- CreateIndex
CREATE INDEX "LabExam_userId_idx" ON "public"."LabExam"("userId");

-- CreateIndex
CREATE INDEX "LabExam_animalId_idx" ON "public"."LabExam"("animalId");

-- CreateIndex
CREATE INDEX "LabExam_examType_idx" ON "public"."LabExam"("examType");

-- CreateIndex
CREATE INDEX "SyncQueue_userId_idx" ON "public"."SyncQueue"("userId");

-- CreateIndex
CREATE INDEX "SyncQueue_status_idx" ON "public"."SyncQueue"("status");

-- CreateIndex
CREATE INDEX "SyncQueue_entityType_idx" ON "public"."SyncQueue"("entityType");

-- CreateIndex
CREATE INDEX "SyncQueue_createdAt_idx" ON "public"."SyncQueue"("createdAt");

-- CreateIndex
CREATE INDEX "AIConversation_userId_idx" ON "public"."AIConversation"("userId");

-- CreateIndex
CREATE INDEX "AIConversation_sessionId_idx" ON "public"."AIConversation"("sessionId");

-- CreateIndex
CREATE INDEX "AIConversation_createdAt_idx" ON "public"."AIConversation"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."Animal" ADD CONSTRAINT "Animal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Animal" ADD CONSTRAINT "Animal_motherId_fkey" FOREIGN KEY ("motherId") REFERENCES "public"."Animal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Animal" ADD CONSTRAINT "Animal_fatherId_fkey" FOREIGN KEY ("fatherId") REFERENCES "public"."Animal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HealthRecord" ADD CONSTRAINT "HealthRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HealthRecord" ADD CONSTRAINT "HealthRecord_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "public"."Animal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BreedingRecord" ADD CONSTRAINT "BreedingRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BreedingRecord" ADD CONSTRAINT "BreedingRecord_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "public"."Animal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BreedingRecord" ADD CONSTRAINT "BreedingRecord_sireId_fkey" FOREIGN KEY ("sireId") REFERENCES "public"."Animal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserModule" ADD CONSTRAINT "UserModule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserModule" ADD CONSTRAINT "UserModule_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "public"."ModuleRegistry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Product" ADD CONSTRAINT "Product_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StockMovement" ADD CONSTRAINT "StockMovement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."StockMovement" ADD CONSTRAINT "StockMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MilkRecord" ADD CONSTRAINT "MilkRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MilkRecord" ADD CONSTRAINT "MilkRecord_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "public"."Animal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Pasture" ADD CONSTRAINT "Pasture_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LabExam" ADD CONSTRAINT "LabExam_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LabExam" ADD CONSTRAINT "LabExam_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "public"."Animal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SyncQueue" ADD CONSTRAINT "SyncQueue_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AIConversation" ADD CONSTRAINT "AIConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
