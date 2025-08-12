-- CreateTable
CREATE TABLE "public"."InvoiceAttachment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "storage" TEXT NOT NULL,
    "url" TEXT,
    "data" BYTEA,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvoiceAttachment_userId_idx" ON "public"."InvoiceAttachment"("userId");

-- CreateIndex
CREATE INDEX "InvoiceAttachment_invoiceId_idx" ON "public"."InvoiceAttachment"("invoiceId");

-- AddForeignKey
ALTER TABLE "public"."InvoiceAttachment" ADD CONSTRAINT "InvoiceAttachment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InvoiceAttachment" ADD CONSTRAINT "InvoiceAttachment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."PurchaseInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
