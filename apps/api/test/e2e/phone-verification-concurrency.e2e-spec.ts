import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { App } from 'supertest/types';
import { AppModule } from './../../src/app.module';
import { PrismaService } from './../../src/database/prisma.service';
import { IDENTITY_REPOSITORY } from './../../src/auth/application/auth.tokens';
import type { IdentityRepositoryPort } from './../../src/auth/application/auth.ports';

// AGENTS.md:47 — challenge consumption is security-critical and must stay an
// atomic compare-and-swap, never a read-then-write. `verifyPhoneChallenge` is
// the one challenge consumer that reads and then writes unguarded, so two
// concurrent submissions can both pass the read. These scenarios drive the real
// repository against the disposable e2e database with genuinely concurrent
// calls, which is the only way the race is observable.
describe('phone verification concurrency (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let identity: IdentityRepositoryPort;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    identity = app.get<IdentityRepositoryPort>(IDENTITY_REPOSITORY);

    // Open the whole pool up front. A cold pool serializes the first batch on
    // connection establishment, which would hide the race this suite exists to
    // expose; a warm pool lets every concurrent call reach its read before any
    // of them commits.
    await warmPool();
  });

  afterAll(async () => {
    await app.close();
  });

  async function warmPool(connections = 10): Promise<void> {
    await Promise.all(
      Array.from({ length: connections }, () => prisma.$queryRaw`SELECT 1`),
    );
  }

  async function seedChallenge(options: {
    codeHmac: string;
    now: Date;
  }): Promise<{ userId: string; phoneE164: string }> {
    const user = await prisma.user.create({
      data: { displayName: `Concurrency ${randomUUID().slice(0, 8)}` },
    });
    const phoneE164 = `+1555${Date.now().toString().slice(-7)}`;
    await identity.createPhoneChallenge({
      userId: user.id,
      phoneE164,
      codeHmac: options.codeHmac,
      expiresAt: new Date(options.now.getTime() + 5 * 60 * 1000),
    });
    return { userId: user.id, phoneE164 };
  }

  it('consumes a correct code exactly once when the code is verified concurrently', async () => {
    const now = new Date();
    const codeHmac = 'correct-code-hmac';
    const { userId, phoneE164 } = await seedChallenge({ codeHmac, now });

    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        identity.verifyPhoneChallenge({
          userId,
          phoneE164,
          codeHmac,
          now,
          maxAttempts: 5,
        }),
      ),
    );

    expect(results.filter((verified) => verified)).toHaveLength(1);

    const consumed = await prisma.phoneVerificationChallenge.count({
      where: { userId, consumedAt: { not: null } },
    });
    expect(consumed).toBe(1);
  });

  it('never pushes attempts past maxAttempts under concurrent wrong codes', async () => {
    const now = new Date();
    const maxAttempts = 3;
    const { userId, phoneE164 } = await seedChallenge({
      codeHmac: 'the-correct-code',
      now,
    });

    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        identity.verifyPhoneChallenge({
          userId,
          phoneE164,
          codeHmac: 'a-wrong-code',
          now,
          maxAttempts,
        }),
      ),
    );

    // Every guess was wrong, so none may succeed...
    expect(results.every((verified) => verified === false)).toBe(true);

    // ...and the cap holds: concurrency must not let more than `maxAttempts`
    // guesses be counted against the challenge.
    const challenge = await prisma.phoneVerificationChallenge.findFirst({
      where: { userId, phoneE164 },
      orderBy: { createdAt: 'desc' },
    });
    expect(challenge?.attempts).toBeLessThanOrEqual(maxAttempts);
  });
});
