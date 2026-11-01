import {
  BadRequestException,
  ForbiddenException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Money } from '../../../catalog/money';
import {
  PublishOfferUseCase,
  PublishOfferError,
  PublishOfferErrorCode,
} from '../../application/publish-offer.use-case';
import { OffersController } from './offers.controller';
import type { PublishOfferDto } from './http/publish-offer.dto';
import type { AuthenticatedPrincipal } from '../../../auth/adapters/in/http/auth.decorators';

describe('OffersController', () => {
  let controller: OffersController;
  let useCase: jest.Mocked<PublishOfferUseCase>;

  const principal: AuthenticatedPrincipal = {
    userId: '11111111-1111-4111-8111-111111111111',
    sessionId: 'session-123',
    authMethod: 'password',
  };

  const marketId = 'ciudad-ojeda';

  const dto: PublishOfferDto = {
    pairId: 'VES_USDT',
    initialAmount: '1000.00',
    giveAmount: '100.00',
    receiveAmount: '2.500000',
    minAmount: '10.00',
    maxAmount: '500.00',
    rate: '0.02500000',
    marginPct: '0.00',
    description: 'Venta de bolivares por USDT',
    details: 'Encuentro en Ojeda Mall',
    location: {
      latitude: 10.1969,
      longitude: -71.3081,
    },
  };

  beforeEach(() => {
    useCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<PublishOfferUseCase>;

    controller = new OffersController(useCase);
  });

  it('publishes an offer successfully and returns 201 shape', async () => {
    const mockOffer = {
      id: 'offer-1',
      marketId,
      sellerId: principal.userId,
      status: 'active' as const,
      description: dto.description,
      details: dto.details ?? null,
      currentTermsVersionId: 'terms-1',
      initialAmount: Money.of('1000.00', 'VES'),
      reservedAmount: Money.of('0.00', 'VES'),
      completedAmount: Money.of('0.00', 'VES'),
      availableAmount: Money.of('1000.00', 'VES'),
      location: dto.location,
    };

    const mockTerms = {
      id: 'terms-1',
      offerId: 'offer-1',
      version: 1,
      pairId: 'VES_USDT' as const,
      giveAmount: Money.of('100.00', 'VES'),
      receiveAmount: Money.of('2.500000', 'USDT'),
      rate: '0.02500000',
      marginPct: '0.00',
      minAmount: Money.of('10.00', 'VES'),
      maxAmount: Money.of('500.00', 'VES'),
      expiresAt: new Date(),
      createdAt: new Date(),
    };

    useCase.execute.mockResolvedValueOnce({
      offer: mockOffer,
      terms: mockTerms,
    });

    const response = await controller.publishOffer(principal, marketId, dto);

    expect(response.id).toBe('offer-1');
    expect(response.pairId).toBe('VES_USDT');
    expect(response.terms.version).toBe(1);
    expect(response.terms.giveAmount).toBe('100.00');
    expect(response.terms.receiveAmount).toBe('2.500000');
  });

  it('translates SELLER_INELIGIBLE to ForbiddenException', async () => {
    useCase.execute.mockRejectedValueOnce(
      new PublishOfferError(
        'Seller is not eligible',
        PublishOfferErrorCode.SELLER_INELIGIBLE,
      ),
    );

    await expect(
      controller.publishOffer(principal, marketId, dto),
    ).rejects.toThrow(ForbiddenException);
  });

  it('translates SELLER_NOT_ENTITLED to ForbiddenException', async () => {
    useCase.execute.mockRejectedValueOnce(
      new PublishOfferError(
        'Seller not entitled',
        PublishOfferErrorCode.SELLER_NOT_ENTITLED,
      ),
    );

    await expect(
      controller.publishOffer(principal, marketId, dto),
    ).rejects.toThrow(ForbiddenException);
  });

  it('translates OUTSIDE_MARKET_BOUNDARY to UnprocessableEntityException', async () => {
    useCase.execute.mockRejectedValueOnce(
      new PublishOfferError(
        'Outside boundary',
        PublishOfferErrorCode.OUTSIDE_MARKET_BOUNDARY,
      ),
    );

    await expect(
      controller.publishOffer(principal, marketId, dto),
    ).rejects.toThrow(UnprocessableEntityException);
  });

  it('translates INVALID_PAIR to BadRequestException', async () => {
    useCase.execute.mockRejectedValueOnce(
      new PublishOfferError('Invalid pair', PublishOfferErrorCode.INVALID_PAIR),
    );

    await expect(
      controller.publishOffer(principal, marketId, dto),
    ).rejects.toThrow(BadRequestException);
  });
});
