import { randomUUID } from 'node:crypto';
import { isPairId, type PairId } from '../../catalog/catalog';
import type { Money } from '../../catalog/money';
import type { TransactionRunnerPort } from '../../common/application/transaction.ports';
import type { MarketRepositoryPort } from '../../markets/application/markets.ports';
import type { SellerEligibilityPort } from '../../sellers/application/sellers.ports';
import type { EntitlementPort } from '../../subscriptions/application/subscriptions.ports';
import { createOffer, type GeoLocation, type Offer } from '../domain/offer';
import {
  createInitialTermsVersion,
  type OfferTermsVersion,
} from '../domain/offer-terms-version';
import type {
  OfferRepositoryPort,
  TermsVersionRepositoryPort,
} from './offers.ports';

export enum PublishOfferErrorCode {
  SELLER_INELIGIBLE = 'SELLER_INELIGIBLE',
  SELLER_NOT_ENTITLED = 'SELLER_NOT_ENTITLED',
  OUTSIDE_MARKET_BOUNDARY = 'OUTSIDE_MARKET_BOUNDARY',
  INVALID_PAIR = 'INVALID_PAIR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
}

export class PublishOfferError extends Error {
  constructor(
    message: string,
    public readonly code: PublishOfferErrorCode,
  ) {
    super(message);
    this.name = 'PublishOfferError';
  }
}

export interface PublishOfferCommand {
  readonly sellerId: string;
  readonly marketId: string;
  readonly pairId: PairId;
  readonly initialAmount: Money;
  readonly giveAmount: Money;
  readonly receiveAmount: Money;
  readonly minAmount: Money;
  readonly maxAmount: Money;
  readonly rate: string | null;
  readonly marginPct: string;
  readonly description: string;
  readonly details?: string | null;
  readonly location: GeoLocation;
  readonly expiresAt?: Date;
}

export interface PublishOfferResult {
  readonly offer: Offer;
  readonly terms: OfferTermsVersion;
}

export class PublishOfferUseCase {
  constructor(
    private readonly sellerEligibilityPort: SellerEligibilityPort,
    private readonly entitlementPort: EntitlementPort,
    private readonly marketRepository: MarketRepositoryPort,
    private readonly offerRepository: OfferRepositoryPort,
    private readonly termsVersionRepository: TermsVersionRepositoryPort,
    private readonly transactionRunner: TransactionRunnerPort,
  ) {}

  async execute(command: PublishOfferCommand): Promise<PublishOfferResult> {
    // 1. Validate pair against MVP catalog
    const rawPairId = String(command.pairId);
    if (!isPairId(rawPairId)) {
      throw new PublishOfferError(
        `Pair ${rawPairId} is not part of the MVP catalog`,
        PublishOfferErrorCode.INVALID_PAIR,
      );
    }

    // 2. Compose Gate: Seller Eligibility (ADR-0006)
    const eligibility = await this.sellerEligibilityPort.getEligibility(
      command.sellerId,
    );
    if (!eligibility || eligibility.state !== 'eligible') {
      throw new PublishOfferError(
        `Seller ${command.sellerId} is not eligible to publish offers`,
        PublishOfferErrorCode.SELLER_INELIGIBLE,
      );
    }

    // 3. Compose Gate: Entitlement (ADR-0006, ADR-0014)
    const entitlement = await this.entitlementPort.resolveEntitlement(
      command.sellerId,
    );
    if (!entitlement || !entitlement.entitled) {
      throw new PublishOfferError(
        `Seller ${command.sellerId} lacks active subscription entitlement`,
        PublishOfferErrorCode.SELLER_NOT_ENTITLED,
      );
    }

    // 4. Validate Market Geographic Boundary Containment (PostGIS)
    const isInsideMarket = await this.marketRepository.containsPoint(
      command.marketId,
      command.location,
    );
    if (!isInsideMarket) {
      throw new PublishOfferError(
        `Meeting location (${command.location.latitude}, ${command.location.longitude}) is outside market boundary for ${command.marketId}`,
        PublishOfferErrorCode.OUTSIDE_MARKET_BOUNDARY,
      );
    }

    // 5. Construct domain entities
    const offerId = randomUUID();
    const termsId = randomUUID();
    const now = new Date();

    const terms = createInitialTermsVersion({
      id: termsId,
      offerId,
      pairId: command.pairId,
      giveAmount: command.giveAmount,
      receiveAmount: command.receiveAmount,
      rate: command.rate,
      marginPct: command.marginPct,
      minAmount: command.minAmount,
      maxAmount: command.maxAmount,
      expiresAt: command.expiresAt,
      now,
    });

    const offer = createOffer({
      id: offerId,
      marketId: command.marketId,
      sellerId: command.sellerId,
      status: 'active',
      description: command.description,
      details: command.details ?? null,
      currentTermsVersionId: terms.id,
      initialAmount: command.initialAmount,
      location: command.location,
      createdAt: now,
      updatedAt: now,
    });

    // 6. Atomically persist Offer and TermsVersion 1 in a single transaction
    await this.transactionRunner.run(async (transaction) => {
      await this.offerRepository.create(offer, transaction);
      await this.termsVersionRepository.append(terms, transaction);
      await this.offerRepository.pointAtCurrentVersion(
        offer.id,
        terms.id,
        transaction,
      );
    });

    return { offer, terms };
  }
}
