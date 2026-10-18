import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { DatabaseModule } from '../database/database.module';
import {
  ACCESS_TOKEN_ISSUER,
  CLOCK,
  CRYPTO_PROVIDER,
  EMAIL_DELIVERY,
  IDENTITY_REPOSITORY,
  PASSWORD_HASHER,
  SMS_DELIVERY,
  WEBAUTHN_ADAPTER,
} from './application/auth.tokens';
import type {
  AccessTokenIssuerPort,
  ClockPort,
  CryptoProviderPort,
  EmailDeliveryPort,
  IdentityRepositoryPort,
  PasswordHasherPort,
  SmsDeliveryPort,
  WebAuthnAdapterPort,
} from './application/auth.ports';
import { AuthService } from './application/auth.service';
import { SessionService } from './application/session.service';
import {
  AuthController,
  PhoneVerificationController,
} from './adapters/in/http/auth.controller';
import { JwtAuthGuard } from './adapters/in/http/jwt-auth.guard';
import { JwtStrategy } from './adapters/in/http/jwt.strategy';
import {
  InMemoryEmailDeliveryAdapter,
  UnavailableEmailDeliveryAdapter,
} from './adapters/out/email/email-delivery.adapter';
import { Argon2PasswordHasher } from './adapters/out/password/argon2-password-hasher';
import { PrismaIdentityRepository } from './adapters/out/persistence/prisma-identity.repository';
import {
  InMemorySmsDeliveryAdapter,
  UnavailableSmsDeliveryAdapter,
} from './adapters/out/sms/sms-delivery.adapter';
import { SimpleWebAuthnAdapter } from './adapters/out/passkeys/simple-webauthn.adapter';
import {
  CryptoAuthAdapter,
  SystemClockAdapter,
} from './adapters/out/crypto/crypto-auth.adapter';
import { JwtAccessTokenAdapter } from './adapters/out/tokens/jwt-access-token.adapter';

@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        privateKey: config.getOrThrow<string>('JWT_PRIVATE_KEY'),
        publicKey: config.getOrThrow<string>('JWT_PUBLIC_KEY'),
        signOptions: {
          algorithm: 'RS256' as const,
          issuer: config.getOrThrow<string>('JWT_ISSUER'),
          audience: config.getOrThrow<string>('JWT_AUDIENCE'),
          expiresIn: config.get<number>('JWT_ACCESS_TTL_SECONDS', 600),
        },
        verifyOptions: {
          algorithms: ['RS256'] as const,
          issuer: config.getOrThrow<string>('JWT_ISSUER'),
          audience: config.getOrThrow<string>('JWT_AUDIENCE'),
        },
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
  ],
  controllers: [AuthController, PhoneVerificationController],
  providers: [
    { provide: IDENTITY_REPOSITORY, useClass: PrismaIdentityRepository },
    { provide: PASSWORD_HASHER, useClass: Argon2PasswordHasher },
    {
      provide: EMAIL_DELIVERY,
      useFactory: (config: ConfigService): EmailDeliveryPort =>
        config.get('EMAIL_DELIVERY_MODE') === 'test'
          ? new InMemoryEmailDeliveryAdapter()
          : new UnavailableEmailDeliveryAdapter(),
      inject: [ConfigService],
    },
    {
      provide: SMS_DELIVERY,
      useFactory: (config: ConfigService): SmsDeliveryPort =>
        config.get('SMS_DELIVERY_MODE') === 'test'
          ? new InMemorySmsDeliveryAdapter()
          : new UnavailableSmsDeliveryAdapter(),
      inject: [ConfigService],
    },
    { provide: WEBAUTHN_ADAPTER, useClass: SimpleWebAuthnAdapter },
    {
      provide: CRYPTO_PROVIDER,
      useFactory: (config: ConfigService): CryptoProviderPort =>
        new CryptoAuthAdapter(config.getOrThrow<string>('PHONE_OTP_PEPPER')),
      inject: [ConfigService],
    },
    { provide: CLOCK, useClass: SystemClockAdapter },
    {
      provide: ACCESS_TOKEN_ISSUER,
      useFactory: (
        jwt: JwtService,
        config: ConfigService,
        crypto: CryptoProviderPort,
      ): AccessTokenIssuerPort =>
        new JwtAccessTokenAdapter(jwt, config, crypto),
      inject: [JwtService, ConfigService, CRYPTO_PROVIDER],
    },
    {
      provide: SessionService,
      useFactory: (
        identity: IdentityRepositoryPort,
        crypto: CryptoProviderPort,
        accessTokenIssuer: AccessTokenIssuerPort,
        clock: ClockPort,
        config: ConfigService,
      ) =>
        new SessionService(
          identity,
          crypto,
          accessTokenIssuer,
          clock,
          config.get<number>('JWT_ACCESS_TTL_SECONDS', 600),
          config.get<number>('JWT_REFRESH_TTL_SECONDS', 2_592_000),
        ),
      inject: [
        IDENTITY_REPOSITORY,
        CRYPTO_PROVIDER,
        ACCESS_TOKEN_ISSUER,
        CLOCK,
        ConfigService,
      ],
    },
    {
      provide: AuthService,
      useFactory: (
        identity: IdentityRepositoryPort,
        passwordHasher: PasswordHasherPort,
        emailDelivery: EmailDeliveryPort,
        smsDelivery: SmsDeliveryPort,
        webAuthn: WebAuthnAdapterPort,
        crypto: CryptoProviderPort,
        clock: ClockPort,
        sessions: SessionService,
      ) =>
        new AuthService(
          identity,
          passwordHasher,
          emailDelivery,
          smsDelivery,
          webAuthn,
          crypto,
          clock,
          sessions,
        ),
      inject: [
        IDENTITY_REPOSITORY,
        PASSWORD_HASHER,
        EMAIL_DELIVERY,
        SMS_DELIVERY,
        WEBAUTHN_ADAPTER,
        CRYPTO_PROVIDER,
        CLOCK,
        SessionService,
      ],
    },
    JwtStrategy,
    JwtAuthGuard,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
  exports: [IDENTITY_REPOSITORY, AuthService],
})
export class AuthModule {}
