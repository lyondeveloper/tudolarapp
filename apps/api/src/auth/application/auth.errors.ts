export type AuthApplicationErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'INVALID_REFRESH_TOKEN'
  | 'INVALID_EMAIL_ACTION'
  | 'EMAIL_DELIVERY_UNAVAILABLE'
  | 'SMS_DELIVERY_UNAVAILABLE'
  | 'INVALID_PASSKEY_CHALLENGE'
  | 'INVALID_PASSKEY_RESPONSE'
  | 'INVALID_PHONE_CHALLENGE'
  | 'USER_NOT_FOUND'
  | 'AUTH_METHOD_UNAVAILABLE';

export class AuthApplicationError extends Error {
  constructor(readonly code: AuthApplicationErrorCode) {
    super(code);
    this.name = 'AuthApplicationError';
  }
}
