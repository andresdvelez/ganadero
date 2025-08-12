-- CreateTable
CREATE TABLE "public"."Task" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL,
    "priority" TEXT,
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FinanceTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "counterparty" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Sensor" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "status" TEXT,
    "lastReadingAt" TIMESTAMP(3),
    "locationName" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sensor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Location" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "areaHa" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AIChoice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "messageId" TEXT,
    "chosenModule" TEXT NOT NULL,
    "chosenAction" TEXT,
    "keywords" TEXT,
    "tone" TEXT,
    "candidates" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIChoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BreedingSyncBatch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "protocol" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BreedingSyncBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BreedingSyncAnimal" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "status" TEXT,
    "date" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "BreedingSyncAnimal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PalpationRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "palpationDate" TIMESTAMP(3) NOT NULL,
    "result" TEXT NOT NULL,
    "technician" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PalpationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AbortionRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "cause" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AbortionRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MastitisCase" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL,
    "quarter" TEXT,
    "cmtScore" TEXT,
    "bacteria" TEXT,
    "antibiogram" TEXT,
    "labExamId" TEXT,
    "treatment" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MastitisCase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WeightRecord" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "weighedAt" TIMESTAMP(3) NOT NULL,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "method" TEXT,
    "source" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeightRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CarcassData" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "animalId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "hotCarcassKg" DOUBLE PRECISION,
    "coldCarcassKg" DOUBLE PRECISION,
    "dressingPct" DOUBLE PRECISION,
    "grade" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarcassData_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Supplier" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "taxId" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PurchaseInvoice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "invoiceNumber" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'open',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PurchaseInvoiceItem" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "productId" TEXT,
    "description" TEXT,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "unitCost" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PurchaseInvoiceItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InvoicePayment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "method" TEXT,
    "notes" TEXT,

    CONSTRAINT "InvoicePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AlertRule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "condition" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlertRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AlertInstance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "triggeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'open',
    "payload" TEXT,

    CONSTRAINT "AlertInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PastureEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pastureId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "groupName" TEXT,
    "notes" TEXT,

    CONSTRAINT "PastureEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PastureMeasurement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pastureId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "forageKgDMHa" DOUBLE PRECISION,
    "restDays" INTEGER,
    "growthRate" DOUBLE PRECISION,
    "notes" TEXT,

    CONSTRAINT "PastureMeasurement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AITank" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "serial" TEXT,
    "location" TEXT,
    "capacityLiters" DOUBLE PRECISION,
    "nitrogenLevel" DOUBLE PRECISION,
    "lastRefillAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AITank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SemenBatch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "sireId" TEXT,
    "breed" TEXT,
    "strawCount" INTEGER NOT NULL DEFAULT 0,
    "tankId" TEXT,
    "canister" TEXT,
    "acquiredAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "SemenBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SemenMovement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "semenBatchId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,

    CONSTRAINT "SemenMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EmbryoBatch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "donorId" TEXT,
    "sireId" TEXT,
    "stage" TEXT,
    "strawCount" INTEGER NOT NULL DEFAULT 0,
    "tankId" TEXT,
    "canister" TEXT,
    "frozenAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "EmbryoBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."EmbryoMovement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "embryoBatchId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,

    CONSTRAINT "EmbryoMovement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Task_userId_idx" ON "public"."Task"("userId");

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "public"."Task"("status");

-- CreateIndex
CREATE INDEX "FinanceTransaction_userId_idx" ON "public"."FinanceTransaction"("userId");

-- CreateIndex
CREATE INDEX "FinanceTransaction_type_idx" ON "public"."FinanceTransaction"("type");

-- CreateIndex
CREATE INDEX "FinanceTransaction_date_idx" ON "public"."FinanceTransaction"("date");

-- CreateIndex
CREATE INDEX "Sensor_userId_idx" ON "public"."Sensor"("userId");

-- CreateIndex
CREATE INDEX "Sensor_status_idx" ON "public"."Sensor"("status");

-- CreateIndex
CREATE INDEX "Location_userId_idx" ON "public"."Location"("userId");

-- CreateIndex
CREATE INDEX "Location_name_idx" ON "public"."Location"("name");

-- CreateIndex
CREATE INDEX "AIChoice_userId_idx" ON "public"."AIChoice"("userId");

-- CreateIndex
CREATE INDEX "AIChoice_sessionId_idx" ON "public"."AIChoice"("sessionId");

-- CreateIndex
CREATE INDEX "AIChoice_chosenModule_idx" ON "public"."AIChoice"("chosenModule");

-- CreateIndex
CREATE INDEX "BreedingSyncBatch_userId_idx" ON "public"."BreedingSyncBatch"("userId");

-- CreateIndex
CREATE INDEX "BreedingSyncBatch_startDate_idx" ON "public"."BreedingSyncBatch"("startDate");

-- CreateIndex
CREATE INDEX "BreedingSyncAnimal_animalId_idx" ON "public"."BreedingSyncAnimal"("animalId");

-- CreateIndex
CREATE UNIQUE INDEX "BreedingSyncAnimal_batchId_animalId_key" ON "public"."BreedingSyncAnimal"("batchId", "animalId");

-- CreateIndex
CREATE INDEX "PalpationRecord_userId_idx" ON "public"."PalpationRecord"("userId");

-- CreateIndex
CREATE INDEX "PalpationRecord_animalId_idx" ON "public"."PalpationRecord"("animalId");

-- CreateIndex
CREATE INDEX "PalpationRecord_palpationDate_idx" ON "public"."PalpationRecord"("palpationDate");

-- CreateIndex
CREATE INDEX "AbortionRecord_userId_idx" ON "public"."AbortionRecord"("userId");

-- CreateIndex
CREATE INDEX "AbortionRecord_animalId_idx" ON "public"."AbortionRecord"("animalId");

-- CreateIndex
CREATE INDEX "AbortionRecord_date_idx" ON "public"."AbortionRecord"("date");

-- CreateIndex
CREATE INDEX "MastitisCase_userId_idx" ON "public"."MastitisCase"("userId");

-- CreateIndex
CREATE INDEX "MastitisCase_animalId_idx" ON "public"."MastitisCase"("animalId");

-- CreateIndex
CREATE INDEX "MastitisCase_detectedAt_idx" ON "public"."MastitisCase"("detectedAt");

-- CreateIndex
CREATE INDEX "MastitisCase_status_idx" ON "public"."MastitisCase"("status");

-- CreateIndex
CREATE INDEX "WeightRecord_userId_idx" ON "public"."WeightRecord"("userId");

-- CreateIndex
CREATE INDEX "WeightRecord_animalId_idx" ON "public"."WeightRecord"("animalId");

-- CreateIndex
CREATE INDEX "WeightRecord_weighedAt_idx" ON "public"."WeightRecord"("weighedAt");

-- CreateIndex
CREATE INDEX "CarcassData_userId_idx" ON "public"."CarcassData"("userId");

-- CreateIndex
CREATE INDEX "CarcassData_animalId_idx" ON "public"."CarcassData"("animalId");

-- CreateIndex
CREATE INDEX "CarcassData_date_idx" ON "public"."CarcassData"("date");

-- CreateIndex
CREATE INDEX "Supplier_userId_idx" ON "public"."Supplier"("userId");

-- CreateIndex
CREATE INDEX "Supplier_name_idx" ON "public"."Supplier"("name");

-- CreateIndex
CREATE INDEX "PurchaseInvoice_userId_idx" ON "public"."PurchaseInvoice"("userId");

-- CreateIndex
CREATE INDEX "PurchaseInvoice_supplierId_idx" ON "public"."PurchaseInvoice"("supplierId");

-- CreateIndex
CREATE INDEX "PurchaseInvoice_date_idx" ON "public"."PurchaseInvoice"("date");

-- CreateIndex
CREATE INDEX "PurchaseInvoice_status_idx" ON "public"."PurchaseInvoice"("status");

-- CreateIndex
CREATE INDEX "InvoicePayment_userId_idx" ON "public"."InvoicePayment"("userId");

-- CreateIndex
CREATE INDEX "InvoicePayment_invoiceId_idx" ON "public"."InvoicePayment"("invoiceId");

-- CreateIndex
CREATE INDEX "InvoicePayment_date_idx" ON "public"."InvoicePayment"("date");

-- CreateIndex
CREATE INDEX "AlertRule_userId_idx" ON "public"."AlertRule"("userId");

-- CreateIndex
CREATE INDEX "AlertRule_module_idx" ON "public"."AlertRule"("module");

-- CreateIndex
CREATE INDEX "AlertRule_enabled_idx" ON "public"."AlertRule"("enabled");

-- CreateIndex
CREATE INDEX "AlertInstance_userId_idx" ON "public"."AlertInstance"("userId");

-- CreateIndex
CREATE INDEX "AlertInstance_ruleId_idx" ON "public"."AlertInstance"("ruleId");

-- CreateIndex
CREATE INDEX "AlertInstance_status_idx" ON "public"."AlertInstance"("status");

-- CreateIndex
CREATE INDEX "AlertInstance_triggeredAt_idx" ON "public"."AlertInstance"("triggeredAt");

-- CreateIndex
CREATE INDEX "PastureEvent_userId_idx" ON "public"."PastureEvent"("userId");

-- CreateIndex
CREATE INDEX "PastureEvent_pastureId_idx" ON "public"."PastureEvent"("pastureId");

-- CreateIndex
CREATE INDEX "PastureEvent_date_idx" ON "public"."PastureEvent"("date");

-- CreateIndex
CREATE INDEX "PastureMeasurement_userId_idx" ON "public"."PastureMeasurement"("userId");

-- CreateIndex
CREATE INDEX "PastureMeasurement_pastureId_idx" ON "public"."PastureMeasurement"("pastureId");

-- CreateIndex
CREATE INDEX "PastureMeasurement_date_idx" ON "public"."PastureMeasurement"("date");

-- CreateIndex
CREATE INDEX "AITank_userId_idx" ON "public"."AITank"("userId");

-- CreateIndex
CREATE INDEX "SemenBatch_userId_idx" ON "public"."SemenBatch"("userId");

-- CreateIndex
CREATE INDEX "SemenBatch_code_idx" ON "public"."SemenBatch"("code");

-- CreateIndex
CREATE INDEX "SemenMovement_userId_idx" ON "public"."SemenMovement"("userId");

-- CreateIndex
CREATE INDEX "SemenMovement_semenBatchId_idx" ON "public"."SemenMovement"("semenBatchId");

-- CreateIndex
CREATE INDEX "SemenMovement_date_idx" ON "public"."SemenMovement"("date");

-- CreateIndex
CREATE INDEX "EmbryoBatch_userId_idx" ON "public"."EmbryoBatch"("userId");

-- CreateIndex
CREATE INDEX "EmbryoBatch_code_idx" ON "public"."EmbryoBatch"("code");

-- CreateIndex
CREATE INDEX "EmbryoMovement_userId_idx" ON "public"."EmbryoMovement"("userId");

-- CreateIndex
CREATE INDEX "EmbryoMovement_embryoBatchId_idx" ON "public"."EmbryoMovement"("embryoBatchId");

-- CreateIndex
CREATE INDEX "EmbryoMovement_date_idx" ON "public"."EmbryoMovement"("date");

-- AddForeignKey
ALTER TABLE "public"."Task" ADD CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FinanceTransaction" ADD CONSTRAINT "FinanceTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Sensor" ADD CONSTRAINT "Sensor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Location" ADD CONSTRAINT "Location_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AIChoice" ADD CONSTRAINT "AIChoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BreedingSyncBatch" ADD CONSTRAINT "BreedingSyncBatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BreedingSyncAnimal" ADD CONSTRAINT "BreedingSyncAnimal_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "public"."BreedingSyncBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BreedingSyncAnimal" ADD CONSTRAINT "BreedingSyncAnimal_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "public"."Animal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PalpationRecord" ADD CONSTRAINT "PalpationRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PalpationRecord" ADD CONSTRAINT "PalpationRecord_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "public"."Animal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AbortionRecord" ADD CONSTRAINT "AbortionRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AbortionRecord" ADD CONSTRAINT "AbortionRecord_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "public"."Animal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MastitisCase" ADD CONSTRAINT "MastitisCase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MastitisCase" ADD CONSTRAINT "MastitisCase_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "public"."Animal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WeightRecord" ADD CONSTRAINT "WeightRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WeightRecord" ADD CONSTRAINT "WeightRecord_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "public"."Animal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CarcassData" ADD CONSTRAINT "CarcassData_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CarcassData" ADD CONSTRAINT "CarcassData_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "public"."Animal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Supplier" ADD CONSTRAINT "Supplier_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PurchaseInvoice" ADD CONSTRAINT "PurchaseInvoice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PurchaseInvoice" ADD CONSTRAINT "PurchaseInvoice_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "public"."Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PurchaseInvoiceItem" ADD CONSTRAINT "PurchaseInvoiceItem_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."PurchaseInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PurchaseInvoiceItem" ADD CONSTRAINT "PurchaseInvoiceItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InvoicePayment" ADD CONSTRAINT "InvoicePayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InvoicePayment" ADD CONSTRAINT "InvoicePayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."PurchaseInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AlertRule" ADD CONSTRAINT "AlertRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AlertInstance" ADD CONSTRAINT "AlertInstance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AlertInstance" ADD CONSTRAINT "AlertInstance_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "public"."AlertRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PastureEvent" ADD CONSTRAINT "PastureEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PastureEvent" ADD CONSTRAINT "PastureEvent_pastureId_fkey" FOREIGN KEY ("pastureId") REFERENCES "public"."Pasture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PastureMeasurement" ADD CONSTRAINT "PastureMeasurement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PastureMeasurement" ADD CONSTRAINT "PastureMeasurement_pastureId_fkey" FOREIGN KEY ("pastureId") REFERENCES "public"."Pasture"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AITank" ADD CONSTRAINT "AITank_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SemenBatch" ADD CONSTRAINT "SemenBatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SemenBatch" ADD CONSTRAINT "SemenBatch_tankId_fkey" FOREIGN KEY ("tankId") REFERENCES "public"."AITank"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SemenBatch" ADD CONSTRAINT "SemenBatch_sireId_fkey" FOREIGN KEY ("sireId") REFERENCES "public"."Animal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SemenMovement" ADD CONSTRAINT "SemenMovement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SemenMovement" ADD CONSTRAINT "SemenMovement_semenBatchId_fkey" FOREIGN KEY ("semenBatchId") REFERENCES "public"."SemenBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmbryoBatch" ADD CONSTRAINT "EmbryoBatch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmbryoBatch" ADD CONSTRAINT "EmbryoBatch_tankId_fkey" FOREIGN KEY ("tankId") REFERENCES "public"."AITank"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmbryoBatch" ADD CONSTRAINT "EmbryoBatch_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "public"."Animal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmbryoBatch" ADD CONSTRAINT "EmbryoBatch_sireId_fkey" FOREIGN KEY ("sireId") REFERENCES "public"."Animal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmbryoMovement" ADD CONSTRAINT "EmbryoMovement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."EmbryoMovement" ADD CONSTRAINT "EmbryoMovement_embryoBatchId_fkey" FOREIGN KEY ("embryoBatchId") REFERENCES "public"."EmbryoBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
