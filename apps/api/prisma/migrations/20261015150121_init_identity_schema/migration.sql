-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "display_name" TEXT NOT NULL,
    "username" TEXT,
    "username_normalized" TEXT,
    "email" TEXT,
    "email_normalized" TEXT,
    "email_verified_at" TIMESTAMPTZ(6),
    "password_hash" TEXT,
    "phone_e164" TEXT,
    "phone_verified_at" TIMESTAMPTZ(6),
    "account_status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "passkey_credentials" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "credential_id" TEXT NOT NULL,
    "public_key" BYTEA NOT NULL,
    "signature_counter" BIGINT NOT NULL DEFAULT 0,
    "transports" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "device_type" TEXT,
    "backed_up" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMPTZ(6),

    CONSTRAINT "passkey_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_family_id" UUID NOT NULL,
    "refresh_token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "replaced_by_session_id" UUID,
    "last_used_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_challenges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "purpose" TEXT NOT NULL,
    "challenge" TEXT NOT NULL,
    "user_id" UUID,
    "context" JSONB NOT NULL DEFAULT '{}',
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "consumed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_action_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "purpose" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "context" JSONB NOT NULL DEFAULT '{}',
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "consumed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_action_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "phone_verification_challenges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "phone_e164" TEXT NOT NULL,
    "code_hmac" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "consumed_at" TIMESTAMPTZ(6),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "phone_verification_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_normalized_uq" ON "users"("username_normalized") WHERE (username_normalized IS NOT NULL);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_normalized_uq" ON "users"("email_normalized") WHERE (email_normalized IS NOT NULL);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_e164_uq" ON "users"("phone_e164") WHERE (phone_e164 IS NOT NULL);

-- CreateIndex
CREATE UNIQUE INDEX "passkey_credentials_credential_id_key" ON "passkey_credentials"("credential_id");

-- CreateIndex
CREATE INDEX "passkey_credentials_user_id_idx" ON "passkey_credentials"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_refresh_token_hash_key" ON "auth_sessions"("refresh_token_hash");

-- CreateIndex
CREATE INDEX "auth_sessions_user_id_revoked_at_idx" ON "auth_sessions"("user_id", "revoked_at");

-- CreateIndex
CREATE INDEX "auth_sessions_token_family_id_revoked_at_idx" ON "auth_sessions"("token_family_id", "revoked_at");

-- CreateIndex
CREATE INDEX "auth_challenges_purpose_expires_at_idx" ON "auth_challenges"("purpose", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "email_action_tokens_token_hash_key" ON "email_action_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "email_action_tokens_user_id_purpose_expires_at_idx" ON "email_action_tokens"("user_id", "purpose", "expires_at");

-- CreateIndex
CREATE INDEX "phone_verification_challenges_user_id_expires_at_idx" ON "phone_verification_challenges"("user_id", "expires_at");

-- AddForeignKey
ALTER TABLE "passkey_credentials" ADD CONSTRAINT "passkey_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_challenges" ADD CONSTRAINT "auth_challenges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_action_tokens" ADD CONSTRAINT "email_action_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "phone_verification_challenges" ADD CONSTRAINT "phone_verification_challenges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Hand-written below: Prisma Migrate cannot express CHECK constraints yet, and
-- `prisma db pull` does not introspect them either. If a future `prisma migrate
-- dev` ever proposes dropping these, the schema has drifted and the generated
-- SQL is wrong -- restore them instead of accepting the drop.

ALTER TABLE "users" ADD CONSTRAINT "users_account_status_check"
  CHECK (account_status IN ('pending_email', 'active', 'suspended'));

ALTER TABLE "passkey_credentials" ADD CONSTRAINT "passkey_signature_counter_nonnegative_check"
  CHECK (signature_counter >= 0);

ALTER TABLE "auth_challenges" ADD CONSTRAINT "auth_challenges_purpose_check"
  CHECK (purpose IN ('passkey_registration', 'passkey_authentication'));

ALTER TABLE "email_action_tokens" ADD CONSTRAINT "email_action_tokens_purpose_check"
  CHECK (purpose IN ('verify_email', 'password_reset', 'add_password'));

ALTER TABLE "phone_verification_challenges" ADD CONSTRAINT "phone_verification_attempts_nonnegative_check"
  CHECK (attempts >= 0);

ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_expiry_check"
  CHECK (expires_at > created_at);
