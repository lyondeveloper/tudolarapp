import type {
  AccessTokenIssuerPort,
  ClockPort,
  CryptoProviderPort,
  IdentityRepositoryPort,
} from './auth.ports';
import { AuthApplicationError } from './auth.errors';
import type { AuthTokenPair } from './auth.models';

export class SessionService {
  constructor(
    private readonly identity: IdentityRepositoryPort,
    private readonly crypto: CryptoProviderPort,
    private readonly accessTokenIssuer: AccessTokenIssuerPort,
    private readonly clock: ClockPort,
    private readonly accessTtlSeconds: number,
    private readonly refreshTtlSeconds: number,
  ) {}

  async issue(userId: string): Promise<AuthTokenPair> {
    const user = await this.identity.findById(userId);
    if (!user || user.accountStatus !== 'active') {
      throw new AuthApplicationError('INVALID_CREDENTIALS');
    }

    const sessionId = this.crypto.generateId();
    const refreshToken = this.crypto.generateOpaqueToken();
    const now = this.clock.now();
    await this.identity.createSession({
      id: sessionId,
      userId,
      tokenFamilyId: this.crypto.generateId(),
      refreshTokenHash: this.crypto.hashToken(refreshToken),
      expiresAt: new Date(now.getTime() + this.refreshTtlSeconds * 1000),
    });

    return {
      accessToken: await this.accessTokenIssuer.issue(userId, sessionId),
      accessTokenExpiresIn: this.accessTtlSeconds,
      refreshToken,
      refreshTokenExpiresIn: this.refreshTtlSeconds,
    };
  }

  async refresh(refreshToken: string): Promise<AuthTokenPair> {
    const oldHash = this.crypto.hashToken(refreshToken);
    const session = await this.identity.findSessionByRefreshHash(oldHash);
    if (!session) throw new AuthApplicationError('INVALID_REFRESH_TOKEN');

    const now = this.clock.now();
    if (session.revokedAt || session.expiresAt <= now) {
      await this.identity.revokeSessionFamily(session.tokenFamilyId, now);
      throw new AuthApplicationError('INVALID_REFRESH_TOKEN');
    }

    const user = await this.identity.findById(session.userId);
    if (!user || user.accountStatus !== 'active') {
      await this.identity.revokeUserSessions(session.userId, now);
      throw new AuthApplicationError('INVALID_REFRESH_TOKEN');
    }

    const newSessionId = this.crypto.generateId();
    const nextRefreshToken = this.crypto.generateOpaqueToken();
    const rotated = await this.identity.rotateSession({
      sessionId: session.id,
      oldHash,
      newSessionId,
      newHash: this.crypto.hashToken(nextRefreshToken),
      expiresAt: new Date(now.getTime() + this.refreshTtlSeconds * 1000),
      now,
    });
    if (!rotated) throw new AuthApplicationError('INVALID_REFRESH_TOKEN');

    return {
      accessToken: await this.accessTokenIssuer.issue(user.id, newSessionId),
      accessTokenExpiresIn: this.accessTtlSeconds,
      refreshToken: nextRefreshToken,
      refreshTokenExpiresIn: this.refreshTtlSeconds,
    };
  }

  logout(userId: string, sessionId: string): Promise<void> {
    return this.identity.revokeSession(sessionId, userId, this.clock.now());
  }
}
