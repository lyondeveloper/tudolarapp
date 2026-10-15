import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from '@simplewebauthn/server';
import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from '@simplewebauthn/server';
import type { PasskeyCredential } from '../../../domain/user';
import type { WebAuthnAdapterPort } from '../../../application/auth.ports';

@Injectable()
export class SimpleWebAuthnAdapter implements WebAuthnAdapterPort {
  private readonly rpId: string;
  private readonly rpName: string;
  private readonly origins: string[];

  constructor(config: ConfigService) {
    this.rpId = config.getOrThrow<string>('WEBAUTHN_RP_ID');
    this.rpName = config.getOrThrow<string>('WEBAUTHN_RP_NAME');
    this.origins = config
      .getOrThrow<string>('WEBAUTHN_ORIGINS')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
  }

  async generateRegistrationOptions(input: {
    userId: string;
    username: string;
    displayName: string;
    excludeCredentialIds?: string[];
  }): Promise<{ challenge: string; options: Record<string, unknown> }> {
    const options = await generateRegistrationOptions({
      rpName: this.rpName,
      rpID: this.rpId,
      userID: new TextEncoder().encode(input.userId),
      userName: input.username,
      userDisplayName: input.displayName,
      timeout: 60_000,
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'required',
      },
      excludeCredentials: (input.excludeCredentialIds ?? []).map((id) => ({
        id,
      })),
    });
    return {
      challenge: options.challenge,
      options: Object.fromEntries(Object.entries(options)),
    };
  }

  async verifyRegistration(input: {
    response: unknown;
    expectedChallenge: string;
  }): Promise<Omit<PasskeyCredential, 'id' | 'userId'> | null> {
    let result: Awaited<ReturnType<typeof verifyRegistrationResponse>>;
    try {
      result = await verifyRegistrationResponse({
        response: input.response as RegistrationResponseJSON,
        expectedChallenge: input.expectedChallenge,
        expectedOrigin: this.origins,
        expectedRPID: this.rpId,
        requireUserVerification: true,
      });
    } catch {
      return null;
    }

    if (!result.verified || !result.registrationInfo.userVerified) return null;
    const { credential, credentialDeviceType, credentialBackedUp } =
      result.registrationInfo;
    return {
      credentialId: credential.id,
      publicKey: new Uint8Array(credential.publicKey),
      signatureCounter: credential.counter,
      transports: credential.transports ?? [],
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
    };
  }

  async generateAuthenticationOptions(input?: {
    allowCredentialIds?: string[];
  }): Promise<{ challenge: string; options: Record<string, unknown> }> {
    const options = await generateAuthenticationOptions({
      rpID: this.rpId,
      userVerification: 'required',
      timeout: 60_000,
      allowCredentials: (input?.allowCredentialIds ?? []).map((id) => ({ id })),
    });
    return {
      challenge: options.challenge,
      options: Object.fromEntries(Object.entries(options)),
    };
  }

  async verifyAuthentication(input: {
    response: unknown;
    expectedChallenge: string;
    credential: PasskeyCredential;
  }): Promise<{ newCounter: number } | null> {
    let result: Awaited<ReturnType<typeof verifyAuthenticationResponse>>;
    try {
      result = await verifyAuthenticationResponse({
        response: input.response as AuthenticationResponseJSON,
        expectedChallenge: input.expectedChallenge,
        expectedOrigin: this.origins,
        expectedRPID: this.rpId,
        requireUserVerification: true,
        credential: {
          id: input.credential.credentialId,
          publicKey: Uint8Array.from(input.credential.publicKey),
          counter: input.credential.signatureCounter,
          transports: input.credential.transports,
        },
      });
    } catch {
      return null;
    }

    if (!result.verified || !result.authenticationInfo.userVerified)
      return null;
    return { newCounter: result.authenticationInfo.newCounter };
  }
}
