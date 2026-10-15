export type AccountStatus = 'pending_email' | 'active' | 'suspended';
export type AuthenticationMethod = 'passkey' | 'password';

export interface User {
  id: string;
  displayName: string;
  username: string | null;
  email: string | null;
  emailVerifiedAt: Date | null;
  phoneE164: string | null;
  phoneVerifiedAt: Date | null;
  accountStatus: AccountStatus;
  createdAt: Date;
}

export interface AuthenticatedUser extends User {
  passwordHash: string | null;
  authMethods: AuthenticationMethod[];
}

export interface PasskeyCredential {
  id: string;
  userId: string;
  credentialId: string;
  publicKey: Uint8Array;
  signatureCounter: number;
  transports: string[];
  deviceType: string | null;
  backedUp: boolean;
}
