import {
  createHash,
  generateKeyPairSync,
  randomBytes,
  sign,
} from 'node:crypto';
import { isoCBOR } from '@simplewebauthn/server/helpers';

type CborValue = Parameters<typeof isoCBOR.encode>[0];
type WebAuthnJson = Record<string, unknown>;

export function createTestAuthenticator(): {
  credentialId: string;
  registrationResponse(
    challenge: string,
    origin: string,
    rpId: string,
  ): WebAuthnJson;
  authenticationResponse(
    challenge: string,
    origin: string,
    rpId: string,
  ): WebAuthnJson;
} {
  const { privateKey, publicKey } = generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
  });
  const publicJwk = publicKey.export({ format: 'jwk' });
  if (!publicJwk.x || !publicJwk.y) {
    throw new Error('Could not derive a test WebAuthn public key');
  }

  const credentialIdBytes = randomBytes(32);
  const credentialId = credentialIdBytes.toString('base64url');
  const cosePublicKey = isoCBOR.encode(
    new Map<number, number | Uint8Array>([
      [1, 2],
      [3, -7],
      [-1, 1],
      [-2, Buffer.from(publicJwk.x, 'base64url')],
      [-3, Buffer.from(publicJwk.y, 'base64url')],
    ]),
  );

  return {
    credentialId,
    registrationResponse(challenge: string, origin: string, rpId: string) {
      const credentialIdLength = Buffer.alloc(2);
      credentialIdLength.writeUInt16BE(credentialIdBytes.length);
      const authenticatorData = Buffer.concat([
        createHash('sha256').update(rpId).digest(),
        Buffer.from([0x45]),
        Buffer.alloc(4),
        Buffer.alloc(16),
        credentialIdLength,
        credentialIdBytes,
        Buffer.from(cosePublicKey),
      ]);
      const attestationObject = isoCBOR.encode(
        new Map<string, CborValue>([
          ['fmt', 'none'],
          ['attStmt', new Map<string, CborValue>()],
          ['authData', new Uint8Array(authenticatorData)],
        ]),
      );
      return {
        id: credentialId,
        rawId: credentialId,
        type: 'public-key',
        authenticatorAttachment: 'platform',
        clientExtensionResults: {},
        response: {
          clientDataJSON: clientData('webauthn.create', challenge, origin),
          attestationObject:
            Buffer.from(attestationObject).toString('base64url'),
          transports: ['internal'],
        },
      };
    },
    authenticationResponse(challenge: string, origin: string, rpId: string) {
      const authenticatorData = Buffer.concat([
        createHash('sha256').update(rpId).digest(),
        Buffer.from([0x05]),
        Buffer.from([0, 0, 0, 1]),
      ]);
      const clientDataJSON = clientData('webauthn.get', challenge, origin);
      const signedData = Buffer.concat([
        authenticatorData,
        createHash('sha256')
          .update(Buffer.from(clientDataJSON, 'base64url'))
          .digest(),
      ]);
      const signature = sign('sha256', signedData, privateKey).toString(
        'base64url',
      );

      return {
        id: credentialId,
        rawId: credentialId,
        type: 'public-key',
        authenticatorAttachment: 'platform',
        clientExtensionResults: {},
        response: {
          clientDataJSON,
          authenticatorData: authenticatorData.toString('base64url'),
          signature,
        },
      };
    },
  };
}

function clientData(type: string, challenge: string, origin: string): string {
  return Buffer.from(
    JSON.stringify({ type, challenge, origin, crossOrigin: false }),
  ).toString('base64url');
}
