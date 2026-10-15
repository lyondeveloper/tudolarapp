import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { AccessTokenIssuerPort } from '../../../application/auth.ports';
import type { CryptoProviderPort } from '../../../application/auth.ports';

export class JwtAccessTokenAdapter implements AccessTokenIssuerPort {
  private readonly accessTtlSeconds: number;

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly crypto: CryptoProviderPort,
  ) {
    this.accessTtlSeconds = this.config.get<number>(
      'JWT_ACCESS_TTL_SECONDS',
      600,
    );
  }

  issue(userId: string, sessionId: string): Promise<string> {
    return this.jwtService.signAsync(
      { sub: userId, sid: sessionId, jti: this.crypto.generateId() },
      {
        algorithm: 'RS256',
        issuer: this.config.getOrThrow<string>('JWT_ISSUER'),
        audience: this.config.getOrThrow<string>('JWT_AUDIENCE'),
        expiresIn: this.accessTtlSeconds,
      },
    );
  }
}
