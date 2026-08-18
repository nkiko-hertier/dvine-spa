-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "citext" WITH SCHEMA "public" VERSION "1.8";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "public" VERSION "1.6";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "plpgsql" WITH SCHEMA "pg_catalog" VERSION "1.0";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "public" VERSION "1.1";

-- CreateEnum
CREATE TYPE "public"."booking_status" AS ENUM ('new_request', 'contacted', 'confirmed', 'completed', 'cancelled', 'no_show');

-- CreateEnum
CREATE TYPE "public"."customer_source" AS ENUM ('instagram', 'facebook', 'tiktok', 'google', 'website', 'referral', 'hotel', 'corporate', 'walk_in', 'other');

-- CreateEnum
CREATE TYPE "public"."user_role" AS ENUM ('admin', 'staff');

-- CreateTable
CREATE TABLE "public"."audit_logs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID,
    "booking_request_id" UUID,
    "action" VARCHAR(100) NOT NULL,
    "old_status" "public"."booking_status",
    "new_status" "public"."booking_status",
    "notes" TEXT,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."booking_requests" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "request_reference" VARCHAR(20),
    "customer_id" UUID NOT NULL,
    "treatment_id" UUID NOT NULL,
    "preferred_date" DATE NOT NULL,
    "preferred_time" TIME(6) NOT NULL,
    "status" "public"."booking_status" NOT NULL DEFAULT 'new_request',
    "staff_notes" TEXT,
    "confirmed_date" DATE,
    "confirmed_time" TIME(6),
    "contacted_at" TIMESTAMP(6),
    "confirmed_at" TIMESTAMP(6),
    "completed_at" TIMESTAMP(6),
    "cancelled_at" TIMESTAMP(6),
    "cancellation_reason" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "channel" "public"."customer_source" NOT NULL DEFAULT 'website',

    CONSTRAINT "booking_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."categories" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "cover_image_url" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."customers" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "full_name" VARCHAR(100) NOT NULL,
    "phone_number" VARCHAR(20) NOT NULL,
    "whatsapp_number" VARCHAR(20),
    "source" "public"."customer_source",
    "customer_since" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."request_reference_counters" (
    "year_part" VARCHAR(4) NOT NULL,
    "last_seq" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "request_reference_counters_pkey" PRIMARY KEY ("year_part")
);

-- CreateTable
CREATE TABLE "public"."staff" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "email" CITEXT NOT NULL,
    "password_hash" VARCHAR(255),
    "full_name" VARCHAR(100) NOT NULL,
    "role" "public"."user_role" NOT NULL DEFAULT 'staff',
    "phone_number" VARCHAR(20),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "clerk_user_id" VARCHAR(64),

    CONSTRAINT "staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."treatments" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "category_id" UUID,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "duration_minutes" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL,
    "image_url" VARCHAR(255),
    "benefits" TEXT[],
    "recommended_for" TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "treatments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."webhook_events" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "provider" VARCHAR(30) NOT NULL DEFAULT 'clerk',
    "event_id" VARCHAR(100) NOT NULL,
    "event_type" VARCHAR(100) NOT NULL,
    "payload" JSONB NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'received',
    "error_message" TEXT,
    "processed_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_audit_booking" ON "public"."audit_logs"("booking_request_id" ASC);

-- CreateIndex
CREATE INDEX "idx_audit_created" ON "public"."audit_logs"("created_at" ASC);

-- CreateIndex
CREATE INDEX "idx_audit_user" ON "public"."audit_logs"("user_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "booking_requests_request_reference_key" ON "public"."booking_requests"("request_reference" ASC);

-- CreateIndex
CREATE INDEX "idx_booking_requests_channel" ON "public"."booking_requests"("channel" ASC);

-- CreateIndex
CREATE INDEX "idx_booking_requests_created" ON "public"."booking_requests"("created_at" ASC);

-- CreateIndex
CREATE INDEX "idx_booking_requests_customer" ON "public"."booking_requests"("customer_id" ASC);

-- CreateIndex
CREATE INDEX "idx_booking_requests_date" ON "public"."booking_requests"("preferred_date" ASC);

-- CreateIndex
CREATE INDEX "idx_booking_requests_status" ON "public"."booking_requests"("status" ASC);

-- CreateIndex
CREATE INDEX "idx_booking_requests_status_date" ON "public"."booking_requests"("status" ASC, "preferred_date" ASC);

-- CreateIndex
CREATE INDEX "idx_booking_requests_treatment" ON "public"."booking_requests"("treatment_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "public"."categories"("name" ASC);

-- CreateIndex
CREATE INDEX "idx_categories_active" ON "public"."categories"("is_active" ASC);

-- CreateIndex
CREATE INDEX "idx_categories_order" ON "public"."categories"("display_order" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "customers_phone_number_key" ON "public"."customers"("phone_number" ASC);

-- CreateIndex
CREATE INDEX "idx_customers_phone" ON "public"."customers"("phone_number" ASC);

-- CreateIndex
CREATE INDEX "idx_customers_since" ON "public"."customers"("customer_since" ASC);

-- CreateIndex
CREATE INDEX "idx_customers_source" ON "public"."customers"("source" ASC);

-- CreateIndex
CREATE INDEX "idx_staff_active" ON "public"."staff"("is_active" ASC);

-- CreateIndex
CREATE INDEX "idx_staff_clerk_user_id" ON "public"."staff"("clerk_user_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "staff_clerk_user_id_key" ON "public"."staff"("clerk_user_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "staff_email_key" ON "public"."staff"("email" ASC);

-- CreateIndex
CREATE INDEX "idx_treatments_active" ON "public"."treatments"("is_active" ASC);

-- CreateIndex
CREATE INDEX "idx_treatments_category" ON "public"."treatments"("category_id" ASC);

-- CreateIndex
CREATE INDEX "idx_treatments_name" ON "public"."treatments"("name" ASC);

-- CreateIndex
CREATE INDEX "idx_treatments_order" ON "public"."treatments"("display_order" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "treatments_name_key" ON "public"."treatments"("name" ASC);

-- CreateIndex
CREATE INDEX "idx_webhook_events_status" ON "public"."webhook_events"("status" ASC);

-- CreateIndex
CREATE INDEX "idx_webhook_events_type" ON "public"."webhook_events"("event_type" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_provider_event_id_key" ON "public"."webhook_events"("provider" ASC, "event_id" ASC);

-- AddForeignKey
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_booking_request_id_fkey" FOREIGN KEY ("booking_request_id") REFERENCES "public"."booking_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."booking_requests" ADD CONSTRAINT "booking_requests_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."booking_requests" ADD CONSTRAINT "booking_requests_treatment_id_fkey" FOREIGN KEY ("treatment_id") REFERENCES "public"."treatments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."treatments" ADD CONSTRAINT "treatments_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

