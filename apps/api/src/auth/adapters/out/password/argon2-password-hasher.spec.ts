import { Argon2PasswordHasher } from './argon2-password-hasher';

describe('Argon2PasswordHasher', () => {
  const hasher = new Argon2PasswordHasher();

  it('hashes with Argon2id and verifies only the matching password', async () => {
    const hash = await hasher.hash('correct-horse-battery-staple');

    expect(hash).toMatch(/^\$argon2id\$/);
    expect(hash).not.toContain('correct-horse-battery-staple');
    await expect(
      hasher.verify(hash, 'correct-horse-battery-staple'),
    ).resolves.toBe(true);
    await expect(hasher.verify(hash, 'incorrect-password')).resolves.toBe(
      false,
    );
  });

  it('treats a malformed stored hash as an invalid password', async () => {
    await expect(
      hasher.verify('not-an-argon2-hash', 'any-password'),
    ).resolves.toBe(false);
  });
});
