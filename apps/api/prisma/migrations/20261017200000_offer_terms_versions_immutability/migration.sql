-- The immutable terms version, and the database-side insert-only rule.
--
-- ADR-0001 makes `offer_terms_versions` the source of truth: an offer points at
-- its current version, a material edit inserts version N+1 and moves the pointer,
-- and an agreement references the version id it agreed to. Immutability is a
-- database invariant, not only application discipline — an edit must not be able
-- to silently change terms both parties already confirmed.
--
-- Prisma cannot model a trigger (or a CHECK), so the insert-only rule is
-- hand-written SQL in this `--create-only` migration, the same class of
-- unmodelled object as the CHECK constraints in the identity migration
-- (AGENTS.md:39). A future `prisma migrate dev` that proposes dropping the
-- trigger or the unique index means the schema has drifted — restore them.
--
-- `offer_id` is a plain UUID here: the `offers` table is T03's data foundation,
-- so the foreign key lands with that table. The per-offer monotonic version is
-- enforced now by the unique `(offer_id, version)` index.

CREATE TABLE "offer_terms_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "offer_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "pair_id" TEXT NOT NULL,
    "give_amount" NUMERIC(24, 6) NOT NULL,
    "receive_amount" NUMERIC(24, 6) NOT NULL,
    "rate" NUMERIC(24, 8),
    "margin_pct" NUMERIC(5, 2) NOT NULL,
    "min_amount" NUMERIC(24, 6) NOT NULL,
    "max_amount" NUMERIC(24, 6) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "offer_terms_versions_pkey" PRIMARY KEY ("id")
);

-- Monotonic per offer: version N+1 cannot collide with an existing row.
CREATE UNIQUE INDEX "offer_terms_versions_offer_id_version_uq"
    ON "offer_terms_versions"("offer_id", "version");

-- Hand-written below: Prisma cannot express a trigger. Version rows are
-- insert-only; an UPDATE or DELETE is rejected by the database itself.

CREATE OR REPLACE FUNCTION "offer_terms_versions_reject_mutation"() RETURNS trigger
    LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'offer_terms_versions rows are insert-only (attempted % of version %)',
        TG_OP, OLD.version
        USING ERRCODE = '23514';
END;
$$;

CREATE TRIGGER "offer_terms_versions_no_update"
    BEFORE UPDATE ON "offer_terms_versions"
    FOR EACH ROW EXECUTE FUNCTION "offer_terms_versions_reject_mutation"();

CREATE TRIGGER "offer_terms_versions_no_delete"
    BEFORE DELETE ON "offer_terms_versions"
    FOR EACH ROW EXECUTE FUNCTION "offer_terms_versions_reject_mutation"();
