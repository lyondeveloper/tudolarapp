export interface PasswordRegistrationInput {
  username: string;
  email: string;
  displayName: string;
  password: string;
}

export interface PasswordEnrollmentInput {
  username: string;
  email: string;
  password: string;
}

export interface PasswordLoginInput {
  identifier: string;
  password: string;
}

export interface PasswordResetInput {
  token: string;
  newPassword: string;
}

export interface PhoneChallengeInput {
  userId: string;
  phoneE164: string;
}

export interface PhoneVerificationInput extends PhoneChallengeInput {
  code: string;
}
