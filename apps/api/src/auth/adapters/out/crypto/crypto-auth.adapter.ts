import {
  createHash,
  createHmac,
  randomBytes,
  randomInt,
  randomUUID,
} from 'node:crypto';
import type {
  ClockPort,
  CryptoProviderPort,
} from '../../../application/auth.ports';

export class CryptoAuthAdapter implements CryptoProviderPort {
  constructor(private readonly phoneOtpPepper: string) {}

  generateId(): string {
    return randomUUID();
  }

  generateOpaqueToken(): string {
    return randomBytes(32).toString('base64url');
  }

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  generatePhoneCode(): string {
    return randomInt(0, 100_000_000).toString().padStart(8, '0');
  }

  hashPhoneCode(userId: string, phoneE164: string, code: string): string {
    return createHmac('sha256', this.phoneOtpPepper)
      .update(`${userId}:${phoneE164}:${code}`)
      .digest('hex');
  }
}

export class SystemClockAdapter implements ClockPort {
  now(): Date {
    return new Date();
  }
}
