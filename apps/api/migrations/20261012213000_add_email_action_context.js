exports.up = (pgm) => {
  pgm.addColumn('email_action_tokens', {
    context: { type: 'jsonb', notNull: true, default: pgm.func("'{}'::jsonb") },
  });
};

exports.down = (pgm) => {
  pgm.dropColumn('email_action_tokens', 'context');
};
