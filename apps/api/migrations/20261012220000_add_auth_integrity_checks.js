exports.up = (pgm) => {
  pgm.addConstraint(
    'passkey_credentials',
    'passkey_signature_counter_nonnegative_check',
    { check: 'signature_counter >= 0' },
  );
  pgm.addConstraint('auth_challenges', 'auth_challenges_purpose_check', {
    check: "purpose IN ('passkey_registration', 'passkey_authentication')",
  });
  pgm.addConstraint('email_action_tokens', 'email_action_tokens_purpose_check', {
    check: "purpose IN ('verify_email', 'password_reset', 'add_password')",
  });
  pgm.addConstraint(
    'phone_verification_challenges',
    'phone_verification_attempts_nonnegative_check',
    { check: 'attempts >= 0' },
  );
  pgm.addConstraint('auth_sessions', 'auth_sessions_expiry_check', {
    check: 'expires_at > created_at',
  });
};

exports.down = (pgm) => {
  pgm.dropConstraint('auth_sessions', 'auth_sessions_expiry_check');
  pgm.dropConstraint(
    'phone_verification_challenges',
    'phone_verification_attempts_nonnegative_check',
  );
  pgm.dropConstraint('email_action_tokens', 'email_action_tokens_purpose_check');
  pgm.dropConstraint('auth_challenges', 'auth_challenges_purpose_check');
  pgm.dropConstraint(
    'passkey_credentials',
    'passkey_signature_counter_nonnegative_check',
  );
};
