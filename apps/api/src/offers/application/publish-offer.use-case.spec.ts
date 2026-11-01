import { Money } from '../../catalog/money';
import type { PairId } from '../../catalog/catalog';
import type { SellerEligibilityPort } from '../../sellers/application/sellers.ports';
import type { EntitlementPort } from '../../subscriptions/application/subscriptions.ports';
import type { MarketRepositoryPort } from '../../markets/application/markets.ports';
import type {
  OfferRepositoryPort,
  TermsVersionRepositoryPort,
} from './offers.ports';
import type { TransactionRunnerPort } from '../../common/application/transaction.ports';
import {
  PublishOfferUseCase,
  PublishOfferError,
  PublishOfferErrorCode,
  type PublishOfferCommand,
} from './publish-offer.use-case';

describe('PublishOfferUseCase', () => {
  const sellerId = '11111111-1111-4111-8111-111111111111';
  const marketId = 'ciudad-ojeda';
  const validLocation = { latitude: 10.1969, longitude: -71.3081 };

  const validCommand: PublishOfferCommand = {
    sellerId,
    marketId,
    pairId: 'VES_USDT',
    initialAmount: Money.of('1000.00', 'VES'),
    giveAmount: Money.of('100.00', 'VES'),
    receiveAmount: Money.of('2.500000', 'USDT'),
    minAmount: Money.of('10.00', 'VES'),
    maxAmount: Money.of('500.00', 'VES'),
    rate: '0.02500000',
    marginPct: '0.00',
    description: 'Venta de bolivares por USDT',
    details: 'Encuentro en Ojeda Mall',
    location: validLocation,
  };

  let sellerEligibilityPort: jest.Mocked<SellerEligibilityPort>;
  let entitlementPort: jest.Mocked<EntitlementPort>;
  let marketRepository: jest.Mocked<MarketRepositoryPort>;
  let offerRepository: jest.Mocked<OfferRepositoryPort>;
  let termsVersionRepository: jest.Mocked<TermsVersionRepositoryPort>;
  let transactionRunner: TransactionRunnerPort;
  let useCase: PublishOfferUseCase;

  const createOfferMock = jest.fn();
  const appendTermsMock = jest.fn();
  const pointAtVersionMock = jest.fn();

  beforeEach(() => {
    createOfferMock.mockReset().mockResolvedValue(undefined);
    appendTermsMock.mockReset().mockResolvedValue(undefined);
    pointAtVersionMock.mockReset().mockResolvedValue(undefined);

    sellerEligibilityPort = {
      getEligibility: jest.fn().mockResolvedValue({
        userId: sellerId,
        state: 'eligible',
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      saveEligibility: jest.fn(),
      getPublicProfile: jest.fn(),
    };

    entitlementPort = {
      resolveEntitlement: jest.fn().mockResolvedValue({
        sellerId,
        entitled: true,
        source: 'temporary',
      }),
    };

    marketRepository = {
      exists: jest.fn().mockResolvedValue(true),
      findById: jest.fn(),
      listActive: jest.fn(),
      containsPoint: jest.fn().mockResolvedValue(true),
    };

    offerRepository = {
      findById: jest.fn(),
      create: createOfferMock,
      pointAtCurrentVersion: pointAtVersionMock,
    };

    termsVersionRepository = {
      current: jest.fn(),
      append: appendTermsMock,
    };

    transactionRunner = {
      run: jest.fn(<T>(op: (tx: any) => Promise<T>) => op({} as any)),
    };

    useCase = new PublishOfferUseCase(
      sellerEligibilityPort,
      entitlementPort,
      marketRepository,
      offerRepository,
      termsVersionRepository,
      transactionRunner,
    );
  });

  it('successfully publishes an offer when seller is eligible, entitled, and coordinates are within boundary', async () => {
    const result = await useCase.execute(validCommand);

    expect(result.offer).toBeDefined();
    expect(result.offer.sellerId).toBe(sellerId);
    expect(result.offer.marketId).toBe(marketId);
    expect(result.offer.status).toBe('active');
    expect(result.offer.currentTermsVersionId).toBe(result.terms.id);

    expect(result.terms.version).toBe(1);
    expect(result.terms.pairId).toBe('VES_USDT');
    expect(result.terms.offerId).toBe(result.offer.id);

    expect(createOfferMock).toHaveBeenCalled();
    expect(appendTermsMock).toHaveBeenCalled();
  });

  it('rejects publication when seller eligibility is not eligible', async () => {
    sellerEligibilityPort.getEligibility.mockResolvedValue({
      userId: sellerId,
      state: 'contact_verified',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(useCase.execute(validCommand)).rejects.toThrow(
      PublishOfferError,
    );

    await expect(useCase.execute(validCommand)).rejects.toMatchObject({
      code: PublishOfferErrorCode.SELLER_INELIGIBLE,
    });

    expect(createOfferMock).not.toHaveBeenCalled();
  });

  it('rejects publication when seller lacks subscription entitlement', async () => {
    entitlementPort.resolveEntitlement.mockResolvedValue({
      sellerId,
      entitled: false,
      source: 'temporary',
    });

    await expect(useCase.execute(validCommand)).rejects.toThrow(
      PublishOfferError,
    );

    await expect(useCase.execute(validCommand)).rejects.toMatchObject({
      code: PublishOfferErrorCode.SELLER_NOT_ENTITLED,
    });

    expect(createOfferMock).not.toHaveBeenCalled();
  });

  it('rejects publication when coordinates fall outside the market boundary', async () => {
    marketRepository.containsPoint.mockResolvedValue(false);

    await expect(useCase.execute(validCommand)).rejects.toThrow(
      PublishOfferError,
    );

    await expect(useCase.execute(validCommand)).rejects.toMatchObject({
      code: PublishOfferErrorCode.OUTSIDE_MARKET_BOUNDARY,
    });

    expect(createOfferMock).not.toHaveBeenCalled();
  });

  it('rejects publication for pairs outside the approved MVP catalog', async () => {
    const invalidPairCommand = {
      ...validCommand,
      pairId: 'VES_ZELLE' as PairId,
    };

    await expect(useCase.execute(invalidPairCommand)).rejects.toThrow(
      PublishOfferError,
    );

    await expect(useCase.execute(invalidPairCommand)).rejects.toMatchObject({
      code: PublishOfferErrorCode.INVALID_PAIR,
    });

    expect(createOfferMock).not.toHaveBeenCalled();
  });
});
