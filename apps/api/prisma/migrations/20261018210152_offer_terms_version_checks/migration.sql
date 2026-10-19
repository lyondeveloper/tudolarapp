-- Prisma cannot model CHECK constraints. Keep these checks in this create-only
-- migration and verify them through pg_constraint.

DO $$
DECLARE
    invalid_id UUID;
BEGIN
    SELECT "id"
    INTO invalid_id
    FROM "offer_terms_versions"
    WHERE "pair_id" NOT IN (
            'VES_USDT',
            'VES_BANK_TO_VES_CASH',
            'VES_USD_CASH',
            'USDT_VES',
            'USDT_USD_CASH'
        )
        OR "version" < 1
        OR "give_amount" <= 0
        OR "receive_amount" <= 0
        OR "min_amount" <= 0
        OR "max_amount" <= 0
        OR "min_amount" > "max_amount"
        OR "margin_pct" < 0
        OR "margin_pct" >= 100
        OR (
            "pair_id" = 'VES_BANK_TO_VES_CASH'
            AND "rate" IS NOT NULL
        )
        OR (
            "pair_id" <> 'VES_BANK_TO_VES_CASH'
            AND ("rate" IS NULL OR "rate" <= 0)
        )
    LIMIT 1;

    IF invalid_id IS NOT NULL THEN
        RAISE EXCEPTION
            'Cannot add offer_terms_versions checks: row % violates the offer terms contract',
            invalid_id
            USING ERRCODE = '23514';
    END IF;
END;
$$;

ALTER TABLE "offer_terms_versions"
    ADD CONSTRAINT "offer_terms_versions_pair_id_check"
        CHECK ("pair_id" IN (
            'VES_USDT',
            'VES_BANK_TO_VES_CASH',
            'VES_USD_CASH',
            'USDT_VES',
            'USDT_USD_CASH'
        )),
    ADD CONSTRAINT "offer_terms_versions_version_positive_check"
        CHECK ("version" >= 1),
    ADD CONSTRAINT "offer_terms_versions_give_amount_positive_check"
        CHECK ("give_amount" > 0),
    ADD CONSTRAINT "offer_terms_versions_receive_amount_positive_check"
        CHECK ("receive_amount" > 0),
    ADD CONSTRAINT "offer_terms_versions_min_amount_positive_check"
        CHECK ("min_amount" > 0),
    ADD CONSTRAINT "offer_terms_versions_max_amount_positive_check"
        CHECK ("max_amount" > 0),
    ADD CONSTRAINT "offer_terms_versions_amount_range_check"
        CHECK ("min_amount" <= "max_amount"),
    ADD CONSTRAINT "offer_terms_versions_margin_pct_check"
        CHECK ("margin_pct" >= 0 AND "margin_pct" < 100),
    ADD CONSTRAINT "offer_terms_versions_rate_pair_check"
        CHECK (
            (
                "pair_id" = 'VES_BANK_TO_VES_CASH'
                AND "rate" IS NULL
            )
            OR (
                "pair_id" <> 'VES_BANK_TO_VES_CASH'
                AND "rate" IS NOT NULL
                AND "rate" > 0
            )
        );