-- CreateTable
CREATE TABLE "seller_eligibilities" (
    "user_id" UUID NOT NULL,
    "state" VARCHAR(32) NOT NULL DEFAULT 'none',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seller_eligibilities_pkey" PRIMARY KEY ("user_id")
);

-- AddForeignKey
ALTER TABLE "seller_eligibilities" ADD CONSTRAINT "seller_eligibilities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddCheckConstraint
ALTER TABLE "seller_eligibilities"
  ADD CONSTRAINT "seller_eligibilities_state_check"
  CHECK ("state" IN ('none', 'contact_verified', 'eligible', 'suspended', 'rejected'));
