-- CreateEnum
CREATE TYPE "BonumInvoicePurpose" AS ENUM ('topup', 'direct_payment');

-- CreateEnum
CREATE TYPE "BonumInvoiceStatus" AS ENUM ('pending', 'paid', 'failed', 'expired');

-- CreateEnum
CREATE TYPE "BonumWebhookEventType" AS ENUM ('payment', 'refund');

-- CreateTable
CREATE TABLE "bonum_invoices" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "order_id" VARCHAR(120) NOT NULL,
    "bonum_invoice_id" VARCHAR(120) NOT NULL,
    "amount" INTEGER NOT NULL,
    "purpose" "BonumInvoicePurpose" NOT NULL,
    "status" "BonumInvoiceStatus" NOT NULL DEFAULT 'pending',
    "qr_text" TEXT NOT NULL,
    "qr_image" TEXT,
    "deep_link_urls" JSONB,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "paid_at" TIMESTAMPTZ,
    "transaction_id" VARCHAR(120),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "bonum_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bonum_webhook_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "transaction_id" VARCHAR(120) NOT NULL,
    "invoice_id" UUID NOT NULL,
    "event_type" "BonumWebhookEventType" NOT NULL,
    "payload" JSONB NOT NULL,
    "signature" VARCHAR(128) NOT NULL,
    "received_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMPTZ,

    CONSTRAINT "bonum_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bonum_invoices_order_id_key" ON "bonum_invoices"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "bonum_invoices_bonum_invoice_id_key" ON "bonum_invoices"("bonum_invoice_id");

-- CreateIndex
CREATE UNIQUE INDEX "bonum_invoices_transaction_id_key" ON "bonum_invoices"("transaction_id");

-- CreateIndex
CREATE INDEX "bonum_invoices_user_id_status_idx" ON "bonum_invoices"("user_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "bonum_webhook_events_transaction_id_key" ON "bonum_webhook_events"("transaction_id");

-- CreateIndex
CREATE INDEX "bonum_webhook_events_invoice_id_idx" ON "bonum_webhook_events"("invoice_id");

-- AddForeignKey
ALTER TABLE "bonum_invoices" ADD CONSTRAINT "bonum_invoices_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bonum_webhook_events" ADD CONSTRAINT "bonum_webhook_events_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "bonum_invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;
