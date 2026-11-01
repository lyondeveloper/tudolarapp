import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/database/prisma.service';
import { ACCESS_TOKEN_ISSUER } from '../../src/auth/application/auth.tokens';
import type { AccessTokenIssuerPort } from '../../src/auth/application/auth.ports';
import { ApiErrorCode } from '../../src/common/errors/api-error-code';

interface JsonResponse {
  body: unknown;
}

interface ErrorPayload {
  error: {
    code: string;
    message: string;
  };
}

interface SellerEligibilityPayload {
  sellerId: string;
  state: string;
}

interface PublicSellerProfilePayload {
  id: string;
  displayName: string;
  state: string;
  memberSince: string;
}

function responseBody<Body>(response: JsonResponse): Body {
  return response.body as Body;
}

describe('Seller Profiles and Eligibility (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let tokenIssuer: AccessTokenIssuerPort;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    tokenIssuer = app.get<AccessTokenIssuerPort>(ACCESS_TOKEN_ISSUER);
  });

  afterAll(async () => {
    await app.close();
  });

  it('manages the seller eligibility lifecycle and preserves public profile privacy', async () => {
    // 1. Create unverified user
    const unverifiedUser = await prisma.user.create({
      data: {
        displayName: 'Pedro Vendedor',
        username: 'pedroseller',
        usernameNormalized: 'pedroseller',
        email: 'pedro@seller.local',
        emailNormalized: 'pedro@seller.local',
        phoneE164: '+584149998877',
        accountStatus: 'active',
      },
    });

    const userToken = await tokenIssuer.issue(
      unverifiedUser.id,
      'test-session-seller',
    );

    // 2. Query eligibility for un-onboarded user -> state is 'none'
    const initialEligibilityRes = await request(app.getHttpServer())
      .get('/sellers/me/eligibility')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    const initialEligibility = responseBody<SellerEligibilityPayload>(
      initialEligibilityRes,
    );
    expect(initialEligibility.sellerId).toBe(unverifiedUser.id);
    expect(initialEligibility.state).toBe('none');

    // 3. Attempt onboarding without verified email -> rejected with 403 EMAIL_NOT_VERIFIED
    const failedOnboardRes = await request(app.getHttpServer())
      .post('/sellers/onboard')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);

    const failedOnboard = responseBody<ErrorPayload>(failedOnboardRes);
    expect(failedOnboard.error.code).toBe(ApiErrorCode.EMAIL_NOT_VERIFIED);

    // 4. Verify email in DB
    await prisma.user.update({
      where: { id: unverifiedUser.id },
      data: { emailVerifiedAt: new Date() },
    });

    // 5. Retry onboarding with verified email -> succeeds with 200 and state 'eligible'
    const successfulOnboardRes = await request(app.getHttpServer())
      .post('/sellers/onboard')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    const successfulOnboard =
      responseBody<SellerEligibilityPayload>(successfulOnboardRes);
    expect(successfulOnboard.sellerId).toBe(unverifiedUser.id);
    expect(successfulOnboard.state).toBe('eligible');

    // 6. Query eligibility again -> state is 'eligible'
    const updatedEligibilityRes = await request(app.getHttpServer())
      .get('/sellers/me/eligibility')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    const updatedEligibility = responseBody<SellerEligibilityPayload>(
      updatedEligibilityRes,
    );
    expect(updatedEligibility.state).toBe('eligible');

    // 7. Public profile query (anonymous) -> returns public signals, omits private fields
    const publicProfileRes = await request(app.getHttpServer())
      .get(`/sellers/${unverifiedUser.id}/profile`)
      .expect(200);

    const publicProfile =
      responseBody<PublicSellerProfilePayload>(publicProfileRes);
    expect(publicProfile.id).toBe(unverifiedUser.id);
    expect(publicProfile.displayName).toBe('Pedro Vendedor');
    expect(publicProfile.state).toBe('eligible');
    expect(publicProfile.memberSince).toBeDefined();

    // Verify private data is NEVER leaked
    const rawBody = publicProfileRes.body as Record<string, unknown>;
    expect(rawBody.email).toBeUndefined();
    expect(rawBody.phoneE164).toBeUndefined();
    expect(rawBody.passwordHash).toBeUndefined();
    expect(rawBody.accountStatus).toBeUndefined();
  });

  it('returns 404 for non-existent seller public profile', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';
    const response = await request(app.getHttpServer())
      .get(`/sellers/${nonExistentId}/profile`)
      .expect(404);

    const body = responseBody<ErrorPayload>(response);
    expect(body.error.code).toBe(ApiErrorCode.NOT_FOUND);
  });
});
