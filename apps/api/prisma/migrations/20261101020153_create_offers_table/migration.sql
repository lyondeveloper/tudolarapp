-- CreateTable
CREATE TABLE "offers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "market_id" VARCHAR(64) NOT NULL,
    "seller_id" UUID NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'active',
    "description" TEXT NOT NULL,
    "details" TEXT,
    "current_terms_version_id" UUID,
    "initial_amount" DECIMAL(24,6) NOT NULL,
    "reserved_amount" DECIMAL(24,6) NOT NULL DEFAULT 0,
    "completed_amount" DECIMAL(24,6) NOT NULL DEFAULT 0,
    "location" geometry(Point, 4326) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "offers_market_id_status_idx" ON "offers"("market_id", "status");

-- CreateIndex
CREATE INDEX "offers_seller_id_idx" ON "offers"("seller_id");

-- CreateIndex
CREATE INDEX "offers_location_gist_idx" ON "offers" USING GIST ("location");

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_market_id_fkey" FOREIGN KEY ("market_id") REFERENCES "markets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Hand-written check constraints (Prisma schema cannot express them yet)
ALTER TABLE "offers"
    ADD CONSTRAINT "offers_status_check"
    CHECK ("status" IN ('active', 'paused', 'exhausted', 'cancelled')),
    ADD CONSTRAINT "offers_reserved_amount_nonnegative_check"
    CHECK ("reserved_amount" >= 0),
    ADD CONSTRAINT "offers_completed_amount_nonnegative_check"
    CHECK ("completed_amount" >= 0),
    ADD CONSTRAINT "offers_inventory_capacity_check"
    CHECK ("reserved_amount" + "completed_amount" <= "initial_amount"),
    ADD CONSTRAINT "offers_initial_amount_positive_check"
    CHECK ("initial_amount" > 0),
    ADD CONSTRAINT "offers_location_srid_check"
    CHECK (ST_SRID("location") = 4326),
    ADD CONSTRAINT "offers_location_type_check"
    CHECK (ST_GeometryType("location") = 'ST_Point');

