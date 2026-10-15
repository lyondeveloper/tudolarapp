import { Injectable } from '@nestjs/common';
import { PostgresDatabase } from '../../../../database/database.module';
import type {
  AuthChallengePurpose,
  AuthChallengeRecord,
  AuthSessionRecord,
  CreatePasswordAccount,
  EmailActionPurpose,
  IdentityRepositoryPort,
  PasswordAccount,
} from '../../../application/auth.ports';
import type { PasskeyCredential, User } from '../../../domain/user';

type UserRow = {
  id: string;
  display_name: string;
  username: string | null;
  email: string | null;
  email_verified_at: Date | null;
  phone_e164: string | null;
  phone_verified_at: Date | null;
  account_status: User['accountStatus'];
  created_at: Date;
  password_hash?: string | null;
  has_passkey?: boolean;
};

type PasskeyRow = UserRow & {
  passkey_id: string;
  credential_id: string;
  public_key: Buffer;
  signature_counter: string | number;
  transports: string[] | null;
  device_type: string | null;
  backed_up: boolean;
};

type ChallengeRow = {
  id: string;
  purpose: AuthChallengePurpose;
  challenge: string;
  user_id: string | null;
  context: Record<string, unknown>;
  expires_at: Date;
};

type EmailActionRow = {
  id: string;
  user_id: string;
  purpose: EmailActionPurpose;
  context: Record<string, unknown>;
  expires_at: Date;
};

type SessionRow = {
  id: string;
  user_id: string;
  token_family_id: string;
  refresh_token_hash: string;
  expires_at: Date;
  revoked_at: Date | null;
};

function mapUser(row: UserRow): User {
  return {
    id: row.id,
    displayName: row.display_name,
    username: row.username,
    email: row.email,
    emailVerifiedAt: row.email_verified_at,
    phoneE164: row.phone_e164,
    phoneVerifiedAt: row.phone_verified_at,
    accountStatus: row.account_status,
    createdAt: row.created_at,
  };
}

function mapPasswordAccount(row: UserRow): PasswordAccount {
  return {
    ...mapUser(row),
    passwordHash: row.password_hash ?? null,
    authMethods: [
      ...(row.password_hash ? (['password'] as const) : []),
      ...(row.has_passkey ? (['passkey'] as const) : []),
    ],
  };
}

@Injectable()
export class PostgresIdentityRepository implements IdentityRepositoryPort {
  constructor(private readonly database: PostgresDatabase) {}

  async findByIdentifier(identifier: string): Promise<PasswordAccount | null> {
    const normalized = identifier.trim().toLowerCase();
    const result = await this.database.query<UserRow>(
      `SELECT u.*,
        EXISTS (
          SELECT 1 FROM passkey_credentials p WHERE p.user_id = u.id
        ) AS has_passkey
       FROM users u
       WHERE u.username_normalized = $1 OR u.email_normalized = $1
       LIMIT 1`,
      [normalized],
    );
    return result.rows[0] ? mapPasswordAccount(result.rows[0]) : null;
  }

  async findById(userId: string): Promise<PasswordAccount | null> {
    const result = await this.database.query<UserRow>(
      `SELECT u.*,
        EXISTS (
          SELECT 1 FROM passkey_credentials p WHERE p.user_id = u.id
        ) AS has_passkey
       FROM users u
       WHERE u.id = $1`,
      [userId],
    );
    return result.rows[0] ? mapPasswordAccount(result.rows[0]) : null;
  }

  async createPasswordAccount(input: CreatePasswordAccount): Promise<boolean> {
    return this.database.transaction(async (client) => {
      const user = await client.query<UserRow>(
        `INSERT INTO users (
          display_name, username, username_normalized, email, email_normalized,
          password_hash, account_status
        ) VALUES ($1, $2, $3, $4, $5, $6, 'pending_email')
        ON CONFLICT DO NOTHING
        RETURNING *`,
        [
          input.displayName,
          input.username,
          input.usernameNormalized,
          input.email,
          input.emailNormalized,
          input.passwordHash,
        ],
      );
      if (!user.rows[0]) return false;

      await client.query(
        `INSERT INTO email_action_tokens (user_id, purpose, token_hash, expires_at)
         VALUES ($1, 'verify_email', $2, $3)`,
        [user.rows[0].id, input.emailTokenHash, input.emailTokenExpiresAt],
      );
      return true;
    });
  }

  async findPasskeyByCredentialId(credentialId: string): Promise<{
    user: User;
    credential: PasskeyCredential;
  } | null> {
    const result = await this.database.query<PasskeyRow>(
      `SELECT u.*, p.id AS passkey_id, p.credential_id, p.public_key,
        p.signature_counter, p.transports, p.device_type, p.backed_up
       FROM passkey_credentials p
       JOIN users u ON u.id = p.user_id
       WHERE p.credential_id = $1`,
      [credentialId],
    );
    const row = result.rows[0];
    if (!row) return null;
    return {
      user: mapUser(row),
      credential: {
        id: row.passkey_id,
        userId: row.id,
        credentialId: row.credential_id,
        publicKey: new Uint8Array(row.public_key),
        signatureCounter: Number(row.signature_counter),
        transports: row.transports ?? [],
        deviceType: row.device_type,
        backedUp: row.backed_up,
      },
    };
  }

  async updatePasskeyCounter(
    credentialId: string,
    counter: number,
  ): Promise<void> {
    await this.database.query(
      `UPDATE passkey_credentials
       SET signature_counter = GREATEST(signature_counter, $2), last_used_at = now()
       WHERE credential_id = $1`,
      [credentialId, counter],
    );
  }

  async createAuthChallenge(input: {
    purpose: AuthChallengePurpose;
    challenge: string;
    userId?: string;
    context?: Record<string, unknown>;
    expiresAt: Date;
  }): Promise<string> {
    const result = await this.database.query<{ id: string }>(
      `INSERT INTO auth_challenges (purpose, challenge, user_id, context, expires_at)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        input.purpose,
        input.challenge,
        input.userId ?? null,
        input.context ?? {},
        input.expiresAt,
      ],
    );
    return result.rows[0].id;
  }

  async getAuthChallenge(
    id: string,
    purpose: AuthChallengePurpose,
  ): Promise<AuthChallengeRecord | null> {
    const result = await this.database.query<ChallengeRow>(
      `SELECT id, purpose, challenge, user_id, context, expires_at
       FROM auth_challenges
       WHERE id = $1 AND purpose = $2 AND consumed_at IS NULL AND expires_at > now()`,
      [id, purpose],
    );
    const row = result.rows[0];
    return row
      ? {
          id: row.id,
          purpose: row.purpose,
          challenge: row.challenge,
          userId: row.user_id,
          context: row.context,
          expiresAt: row.expires_at,
        }
      : null;
  }

  async completePasskeyRegistration(input: {
    challengeId: string;
    challenge: string;
    userId: string;
    displayName: string;
    credential: Omit<PasskeyCredential, 'id' | 'userId'>;
    now: Date;
  }): Promise<User | null> {
    return this.database.transaction(async (client) => {
      const challenge = await client.query<{ id: string }>(
        `UPDATE auth_challenges
         SET consumed_at = $4
         WHERE id = $1 AND purpose = 'passkey_registration'
           AND challenge = $2 AND consumed_at IS NULL AND expires_at > $3
         RETURNING id`,
        [input.challengeId, input.challenge, input.now, input.now],
      );
      if (!challenge.rows[0]) return null;

      const user = await client.query<UserRow>(
        `INSERT INTO users (id, display_name, account_status)
         VALUES ($1, $2, 'active')
         RETURNING *`,
        [input.userId, input.displayName],
      );
      await this.insertPasskey(client, input.userId, input.credential);
      return mapUser(user.rows[0]);
    });
  }

  async completePasskeyEnrollment(input: {
    challengeId: string;
    challenge: string;
    userId: string;
    credential: Omit<PasskeyCredential, 'id' | 'userId'>;
    now: Date;
  }): Promise<boolean> {
    return this.database.transaction(async (client) => {
      const challenge = await client.query<{ id: string }>(
        `UPDATE auth_challenges
         SET consumed_at = $5
         WHERE id = $1 AND purpose = 'passkey_registration' AND user_id = $2
           AND challenge = $3 AND consumed_at IS NULL AND expires_at > $4
         RETURNING id`,
        [
          input.challengeId,
          input.userId,
          input.challenge,
          input.now,
          input.now,
        ],
      );
      if (!challenge.rows[0]) return false;
      await this.insertPasskey(client, input.userId, input.credential);
      return true;
    });
  }

  async consumeAuthChallenge(
    id: string,
    purpose: AuthChallengePurpose,
    now: Date,
  ): Promise<boolean> {
    const result = await this.database.query<{ id: string }>(
      `UPDATE auth_challenges SET consumed_at = $3
       WHERE id = $1 AND purpose = $2 AND consumed_at IS NULL AND expires_at > $3
       RETURNING id`,
      [id, purpose, now],
    );
    return Boolean(result.rows[0]);
  }

  async createEmailAction(input: {
    userId: string;
    purpose: EmailActionPurpose;
    tokenHash: string;
    expiresAt: Date;
    context?: Record<string, unknown>;
  }): Promise<void> {
    await this.database.transaction(async (client) => {
      await client.query(
        `UPDATE email_action_tokens SET consumed_at = now()
         WHERE user_id = $1 AND purpose = $2 AND consumed_at IS NULL`,
        [input.userId, input.purpose],
      );
      await client.query(
        `INSERT INTO email_action_tokens (user_id, purpose, token_hash, expires_at, context)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          input.userId,
          input.purpose,
          input.tokenHash,
          input.expiresAt,
          input.context ?? {},
        ],
      );
    });
  }

  async completeEmailVerification(
    tokenHash: string,
    now: Date,
  ): Promise<boolean> {
    return this.database.transaction(async (client) => {
      const result = await client.query<EmailActionRow>(
        `SELECT id, user_id, purpose, context, expires_at
         FROM email_action_tokens
         WHERE token_hash = $1 AND purpose IN ('verify_email', 'add_password')
           AND consumed_at IS NULL AND expires_at > $2
         FOR UPDATE`,
        [tokenHash, now],
      );
      const token = result.rows[0];
      if (!token) return false;

      const context = token.context ?? {};
      const username =
        typeof context.username === 'string' ? context.username : null;
      const usernameNormalized =
        typeof context.usernameNormalized === 'string'
          ? context.usernameNormalized
          : null;
      const email = typeof context.email === 'string' ? context.email : null;
      const emailNormalized =
        typeof context.emailNormalized === 'string'
          ? context.emailNormalized
          : null;
      const passwordHash =
        typeof context.passwordHash === 'string' ? context.passwordHash : null;
      const user = await client.query<{ id: string }>(
        `UPDATE users
         SET email = COALESCE($2, email),
             email_normalized = COALESCE($3, email_normalized),
             username = COALESCE($4, username),
             username_normalized = COALESCE($5, username_normalized),
             password_hash = COALESCE($6, password_hash),
             email_verified_at = $7,
             account_status = CASE WHEN account_status = 'pending_email' THEN 'active' ELSE account_status END,
             updated_at = $7
         WHERE id = $1
         RETURNING id`,
        [
          token.user_id,
          email,
          emailNormalized,
          username,
          usernameNormalized,
          passwordHash,
          now,
        ],
      );
      if (!user.rows[0]) return false;

      await client.query(
        'UPDATE email_action_tokens SET consumed_at = $2 WHERE id = $1',
        [token.id, now],
      );
      return true;
    });
  }

  async resetPassword(
    tokenHash: string,
    passwordHash: string,
    now: Date,
  ): Promise<string | null> {
    return this.database.transaction(async (client) => {
      const token = await client.query<{ user_id: string }>(
        `UPDATE email_action_tokens SET consumed_at = $3
         WHERE token_hash = $1 AND purpose = $2
           AND consumed_at IS NULL AND expires_at > $3
         RETURNING user_id`,
        [tokenHash, 'password_reset', now],
      );
      const userId = token.rows[0]?.user_id;
      if (!userId) return null;

      const user = await client.query<{ email: string | null }>(
        `UPDATE users SET password_hash = $2, updated_at = now()
         WHERE id = $1 RETURNING email`,
        [userId, passwordHash],
      );
      if (!user.rows[0]) return null;
      await client.query(
        'UPDATE auth_sessions SET revoked_at = $2 WHERE user_id = $1 AND revoked_at IS NULL',
        [userId, now],
      );
      return user.rows[0].email;
    });
  }

  async createPhoneChallenge(input: {
    userId: string;
    phoneE164: string;
    codeHmac: string;
    expiresAt: Date;
  }): Promise<void> {
    await this.database.transaction(async (client) => {
      await client.query(
        `UPDATE phone_verification_challenges SET consumed_at = now()
         WHERE user_id = $1 AND phone_e164 = $2 AND consumed_at IS NULL`,
        [input.userId, input.phoneE164],
      );
      await client.query(
        `INSERT INTO phone_verification_challenges (user_id, phone_e164, code_hmac, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [input.userId, input.phoneE164, input.codeHmac, input.expiresAt],
      );
    });
  }

  async verifyPhoneChallenge(input: {
    userId: string;
    phoneE164: string;
    codeHmac: string;
    now: Date;
    maxAttempts: number;
  }): Promise<boolean> {
    return this.database.transaction(async (client) => {
      const result = await client.query<{
        id: string;
        code_hmac: string;
        attempts: number;
      }>(
        `SELECT id, code_hmac, attempts FROM phone_verification_challenges
         WHERE user_id = $1 AND phone_e164 = $2 AND consumed_at IS NULL
           AND expires_at > $3 AND attempts < $4
         ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
        [input.userId, input.phoneE164, input.now, input.maxAttempts],
      );
      const challenge = result.rows[0];
      if (!challenge) return false;
      if (challenge.code_hmac !== input.codeHmac) {
        await client.query(
          'UPDATE phone_verification_challenges SET attempts = attempts + 1 WHERE id = $1',
          [challenge.id],
        );
        return false;
      }
      await client.query(
        'UPDATE phone_verification_challenges SET consumed_at = $2 WHERE id = $1',
        [challenge.id, input.now],
      );
      return true;
    });
  }

  async markPhoneVerified(
    userId: string,
    phoneE164: string,
    verifiedAt: Date,
  ): Promise<void> {
    await this.database.query(
      `UPDATE users SET phone_e164 = $2, phone_verified_at = $3, updated_at = now()
       WHERE id = $1`,
      [userId, phoneE164, verifiedAt],
    );
  }

  async createSession(input: {
    id: string;
    userId: string;
    tokenFamilyId: string;
    refreshTokenHash: string;
    expiresAt: Date;
  }): Promise<void> {
    await this.database.query(
      `INSERT INTO auth_sessions (id, user_id, token_family_id, refresh_token_hash, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        input.id,
        input.userId,
        input.tokenFamilyId,
        input.refreshTokenHash,
        input.expiresAt,
      ],
    );
  }

  async findSessionByRefreshHash(
    hash: string,
  ): Promise<AuthSessionRecord | null> {
    const result = await this.database.query<SessionRow>(
      `SELECT id, user_id, token_family_id, refresh_token_hash, expires_at, revoked_at
       FROM auth_sessions WHERE refresh_token_hash = $1`,
      [hash],
    );
    const row = result.rows[0];
    return row
      ? {
          id: row.id,
          userId: row.user_id,
          tokenFamilyId: row.token_family_id,
          refreshTokenHash: row.refresh_token_hash,
          expiresAt: row.expires_at,
          revokedAt: row.revoked_at,
        }
      : null;
  }

  async rotateSession(input: {
    sessionId: string;
    oldHash: string;
    newSessionId: string;
    newHash: string;
    expiresAt: Date;
    now: Date;
  }): Promise<boolean> {
    return this.database.transaction(async (client) => {
      const result = await client.query<SessionRow>(
        `SELECT id, user_id, token_family_id, refresh_token_hash, expires_at, revoked_at
         FROM auth_sessions WHERE id = $1 AND refresh_token_hash = $2 FOR UPDATE`,
        [input.sessionId, input.oldHash],
      );
      const session = result.rows[0];
      if (!session) return false;
      if (session.revoked_at || session.expires_at <= input.now) {
        await client.query(
          `UPDATE auth_sessions SET revoked_at = COALESCE(revoked_at, $2)
           WHERE token_family_id = $1 AND revoked_at IS NULL`,
          [session.token_family_id, input.now],
        );
        return false;
      }

      await client.query(
        `UPDATE auth_sessions SET revoked_at = $2, replaced_by_session_id = $3, last_used_at = $2
         WHERE id = $1`,
        [input.sessionId, input.now, input.newSessionId],
      );
      await client.query(
        `INSERT INTO auth_sessions (id, user_id, token_family_id, refresh_token_hash, expires_at)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          input.newSessionId,
          session.user_id,
          session.token_family_id,
          input.newHash,
          input.expiresAt,
        ],
      );
      return true;
    });
  }

  async revokeSession(
    sessionId: string,
    userId: string,
    revokedAt: Date,
  ): Promise<void> {
    await this.database.query(
      `UPDATE auth_sessions SET revoked_at = COALESCE(revoked_at, $3)
       WHERE id = $1 AND user_id = $2`,
      [sessionId, userId, revokedAt],
    );
  }

  async revokeSessionFamily(
    tokenFamilyId: string,
    revokedAt: Date,
  ): Promise<void> {
    await this.database.query(
      'UPDATE auth_sessions SET revoked_at = COALESCE(revoked_at, $2) WHERE token_family_id = $1',
      [tokenFamilyId, revokedAt],
    );
  }

  async revokeUserSessions(userId: string, revokedAt: Date): Promise<void> {
    await this.database.query(
      'UPDATE auth_sessions SET revoked_at = COALESCE(revoked_at, $2) WHERE user_id = $1',
      [userId, revokedAt],
    );
  }

  private async insertPasskey(
    client: import('pg').PoolClient,
    userId: string,
    credential: Omit<PasskeyCredential, 'id' | 'userId'>,
  ): Promise<void> {
    await client.query(
      `INSERT INTO passkey_credentials (
        user_id, credential_id, public_key, signature_counter, transports, device_type, backed_up
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        userId,
        credential.credentialId,
        Buffer.from(credential.publicKey),
        credential.signatureCounter,
        credential.transports,
        credential.deviceType,
        credential.backedUp,
      ],
    );
  }
}
