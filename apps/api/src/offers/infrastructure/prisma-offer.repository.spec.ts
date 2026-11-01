import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { Money } from '../../catalog/money';
import { createOffer } from '../domain/offer';
import { PrismaOfferRepository } from './prisma-offer.repository';
import { PrismaTermsVersionRepository } from './prisma-terms-version.repository';

describe('PrismaOfferRepository & PrismaTermsVersionRepository', () => {
  let prisma: jest.Mocked<PrismaService>;
  let offerRepo: PrismaOfferRepository;
  let termsRepo: PrismaTermsVersionRepository;
  const executeRawMock = jest.fn();
  const queryRawMock = jest.fn();
  const createTermsMock = jest.fn();
  const findFirstTermsMock = jest.fn();

  beforeEach(() => {
    executeRawMock.mockReset();
    queryRawMock.mockReset();
    createTermsMock.mockReset();
    findFirstTermsMock.mockReset();

    prisma = {
      $queryRaw: queryRawMock,
      $executeRaw: executeRawMock,
      offerTermsVersion: {
        findFirst: findFirstTermsMock,
        create: createTermsMock,
      },
    } as unknown as jest.Mocked<PrismaService>;

    offerRepo = new PrismaOfferRepository(prisma);
    termsRepo = new PrismaTermsVersionRepository(prisma);
  });

  describe('PrismaOfferRepository', () => {
    it('creates an offer via $executeRaw with PostGIS Point geometry', async () => {
      const offer = createOffer({
        id: '11111111-1111-4111-8111-111111111111',
        marketId: 'ciudad-ojeda',
        sellerId: '22222222-2222-4222-8222-222222222222',
        status: 'active',
        description: 'Venta de bolivares',
        details: 'En Ojeda Mall',
        currentTermsVersionId: '33333333-3333-4333-8333-333333333333',
        initialAmount: Money.of('100.00', 'VES'),
        location: { latitude: 10.1969, longitude: -71.3081 },
      });

      await offerRepo.create(offer);

      expect(executeRawMock).toHaveBeenCalled();
    });

    it('points at current terms version via $executeRaw', async () => {
      await offerRepo.pointAtCurrentVersion(
        '11111111-1111-4111-8111-111111111111',
        '33333333-3333-4333-8333-333333333333',
      );

      expect(executeRawMock).toHaveBeenCalled();
    });

    it('finds an offer by id and maps to domain model', async () => {
      queryRawMock.mockResolvedValueOnce([
        {
          id: '11111111-1111-4111-8111-111111111111',
          market_id: 'ciudad-ojeda',
          seller_id: '22222222-2222-4222-8222-222222222222',
          status: 'active',
          description: 'Venta de bolivares',
          details: 'En Ojeda Mall',
          currentTermsVersionId: '33333333-3333-4333-8333-333333333333',
          initial_amount: new Prisma.Decimal('100.00'),
          reserved_amount: new Prisma.Decimal('0.00'),
          completed_amount: new Prisma.Decimal('0.00'),
          latitude: 10.1969,
          longitude: -71.3081,
          created_at: new Date(),
          updated_at: new Date(),
          pair_id: 'VES_USDT',
        },
      ]);

      const found = await offerRepo.findById(
        '11111111-1111-4111-8111-111111111111',
      );

      expect(found).not.toBeNull();
      expect(found?.id).toBe('11111111-1111-4111-8111-111111111111');
      expect(found?.initialAmount.toDecimalString()).toBe('100.00');
      expect(found?.location.latitude).toBe(10.1969);
    });

    it('returns null when offer is not found', async () => {
      queryRawMock.mockResolvedValueOnce([]);

      const found = await offerRepo.findById('missing-id');
      expect(found).toBeNull();
    });
  });

  describe('PrismaTermsVersionRepository', () => {
    it('appends a new terms version using prisma model', async () => {
      const termsVersion = {
        id: '33333333-3333-4333-8333-333333333333',
        offerId: '11111111-1111-4111-8111-111111111111',
        version: 1,
        pairId: 'VES_USDT' as const,
        giveAmount: Money.of('100.00', 'VES'),
        receiveAmount: Money.of('2.500000', 'USDT'),
        rate: '0.02500000',
        marginPct: '0.00',
        minAmount: Money.of('10.00', 'VES'),
        maxAmount: Money.of('100.00', 'VES'),
        expiresAt: new Date(),
        createdAt: new Date(),
      };

      await termsRepo.append(termsVersion);

      expect(createTermsMock).toHaveBeenCalledWith({
        data: expect.objectContaining({
          id: termsVersion.id,
          offerId: termsVersion.offerId,
          version: 1,
          pairId: 'VES_USDT',
        }) as unknown,
      });
    });

    it('finds current terms version by offer id', async () => {
      findFirstTermsMock.mockResolvedValueOnce({
        id: '33333333-3333-4333-8333-333333333333',
        offerId: '11111111-1111-4111-8111-111111111111',
        version: 1,
        pairId: 'VES_USDT',
        giveAmount: new Prisma.Decimal('100.00'),
        receiveAmount: new Prisma.Decimal('2.500000'),
        rate: new Prisma.Decimal('0.02500000'),
        marginPct: new Prisma.Decimal('0.00'),
        minAmount: new Prisma.Decimal('10.00'),
        maxAmount: new Prisma.Decimal('100.00'),
        expiresAt: new Date(),
        createdAt: new Date(),
      });

      const found = await termsRepo.current(
        '11111111-1111-4111-8111-111111111111',
      );

      expect(found).not.toBeNull();
      expect(found?.version).toBe(1);
      expect(found?.giveAmount.toDecimalString()).toBe('100.00');
      expect(found?.receiveAmount.toDecimalString()).toBe('2.500000');
    });
  });
});
