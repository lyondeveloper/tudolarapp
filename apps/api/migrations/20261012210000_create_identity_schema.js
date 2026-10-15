exports.up = (pgm) => {
  pgm.createTable('users', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    display_name: { type: 'text', notNull: true },
    username: { type: 'text' },
    username_normalized: { type: 'text' },
    email: { type: 'text' },
    email_normalized: { type: 'text' },
    email_verified_at: { type: 'timestamptz' },
    password_hash: { type: 'text' },
    phone_e164: { type: 'text' },
    phone_verified_at: { type: 'timestamptz' },
    account_status: {
      type: 'text',
      notNull: true,
      default: 'active',
    },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    updated_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });

  pgm.addConstraint('users', 'users_account_status_check', {
    check: "account_status IN ('pending_email', 'active', 'suspended')",
  });
  pgm.createIndex('users', 'username_normalized', {
    name: 'users_username_normalized_uq',
    unique: true,
    where: 'username_normalized IS NOT NULL',
  });
  pgm.createIndex('users', 'email_normalized', {
    name: 'users_email_normalized_uq',
    unique: true,
    where: 'email_normalized IS NOT NULL',
  });
  pgm.createIndex('users', 'phone_e164', {
    name: 'users_phone_e164_uq',
    unique: true,
    where: 'phone_e164 IS NOT NULL',
  });

  pgm.createTable('passkey_credentials', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE',
    },
    credential_id: { type: 'text', notNull: true, unique: true },
    public_key: { type: 'bytea', notNull: true },
    signature_counter: { type: 'bigint', notNull: true, default: 0 },
    transports: { type: 'text[]' },
    device_type: { type: 'text' },
    backed_up: { type: 'boolean', notNull: true, default: false },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    last_used_at: { type: 'timestamptz' },
  });
  pgm.createIndex('passkey_credentials', 'user_id');

  pgm.createTable('auth_sessions', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE',
    },
    token_family_id: { type: 'uuid', notNull: true },
    refresh_token_hash: { type: 'text', notNull: true, unique: true },
    expires_at: { type: 'timestamptz', notNull: true },
    revoked_at: { type: 'timestamptz' },
    replaced_by_session_id: { type: 'uuid' },
    last_used_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('auth_sessions', ['user_id', 'revoked_at']);
  pgm.createIndex('auth_sessions', ['token_family_id', 'revoked_at']);

  pgm.createTable('auth_challenges', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    purpose: { type: 'text', notNull: true },
    challenge: { type: 'text', notNull: true },
    user_id: {
      type: 'uuid',
      references: 'users',
      onDelete: 'CASCADE',
    },
    context: { type: 'jsonb', notNull: true, default: pgm.func("'{}'::jsonb") },
    expires_at: { type: 'timestamptz', notNull: true },
    consumed_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('auth_challenges', ['purpose', 'expires_at']);

  pgm.createTable('email_action_tokens', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE',
    },
    purpose: { type: 'text', notNull: true },
    token_hash: { type: 'text', notNull: true, unique: true },
    expires_at: { type: 'timestamptz', notNull: true },
    consumed_at: { type: 'timestamptz' },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('email_action_tokens', ['user_id', 'purpose', 'expires_at']);

  pgm.createTable('phone_verification_challenges', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users',
      onDelete: 'CASCADE',
    },
    phone_e164: { type: 'text', notNull: true },
    code_hmac: { type: 'text', notNull: true },
    expires_at: { type: 'timestamptz', notNull: true },
    consumed_at: { type: 'timestamptz' },
    attempts: { type: 'integer', notNull: true, default: 0 },
    created_at: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
  });
  pgm.createIndex('phone_verification_challenges', ['user_id', 'expires_at']);
};

exports.down = (pgm) => {
  pgm.dropTable('phone_verification_challenges');
  pgm.dropTable('email_action_tokens');
  pgm.dropTable('auth_challenges');
  pgm.dropTable('auth_sessions');
  pgm.dropTable('passkey_credentials');
  pgm.dropTable('users');
};
