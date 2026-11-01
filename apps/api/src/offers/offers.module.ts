import { Module } from '@nestjs/common';
import { TRANSACTION_RUNNER } from '../common/application/transaction.ports';
import type { TransactionRunnerPort } from '../common/application/transaction.ports';
import { PrismaTransactionRunner } from '../common/adapters/prisma-transaction-runner';
import { MARKET_REPOSITORY } from '../markets/application/markets.ports';
import type { MarketRepositoryPort } from '../markets/application/markets.ports';
import { MarketsModule } from '../markets/markets.module';
import { SELLER_ELIGIBILITY_PORT } from '../sellers/application/sellers.ports';
import type { SellerEligibilityPort } from '../sellers/application/sellers.ports';
import { SellersModule } from '../sellers/sellers.module';
import { ENTITLEMENT_PORT } from '../subscriptions/application/subscriptions.ports';
import type { EntitlementPort } from '../subscriptions/application/subscriptions.ports';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import {
  OFFER_REPOSITORY,
  TERMS_VERSION_REPOSITORY,
} from './application/offers.ports';
import type {
  OfferRepositoryPort,
  TermsVersionRepositoryPort,
} from './application/offers.ports';
import { PublishOfferUseCase } from './application/publish-offer.use-case';
import { PrismaOfferRepository } from './infrastructure/prisma-offer.repository';
import { PrismaTermsVersionRepository } from './infrastructure/prisma-terms-version.repository';
import { OffersController } from './adapters/in/offers.controller';

/**
 * The offers module. It owns offers, terms versions, quotes, and inventory
 * counters, and it composes the publish gate from two ports (ADR-0006).
 */
@Module({
  imports: [MarketsModule, SellersModule, SubscriptionsModule],
  controllers: [OffersController],
  providers: [
    PrismaOfferRepository,
    {
      provide: OFFER_REPOSITORY,
      useExisting: PrismaOfferRepository,
    },
    PrismaTermsVersionRepository,
    {
      provide: TERMS_VERSION_REPOSITORY,
      useExisting: PrismaTermsVersionRepository,
    },
    PrismaTransactionRunner,
    {
      provide: TRANSACTION_RUNNER,
      useExisting: PrismaTransactionRunner,
    },
    {
      provide: PublishOfferUseCase,
      useFactory: (
        sellerEligibilityPort: SellerEligibilityPort,
        entitlementPort: EntitlementPort,
        marketRepository: MarketRepositoryPort,
        offerRepo: OfferRepositoryPort,
        termsRepo: TermsVersionRepositoryPort,
        txRunner: TransactionRunnerPort,
      ) =>
        new PublishOfferUseCase(
          sellerEligibilityPort,
          entitlementPort,
          marketRepository,
          offerRepo,
          termsRepo,
          txRunner,
        ),
      inject: [
        SELLER_ELIGIBILITY_PORT,
        ENTITLEMENT_PORT,
        MARKET_REPOSITORY,
        OFFER_REPOSITORY,
        TERMS_VERSION_REPOSITORY,
        TRANSACTION_RUNNER,
      ],
    },
  ],
  exports: [
    OFFER_REPOSITORY,
    TERMS_VERSION_REPOSITORY,
    PublishOfferUseCase,
    PrismaOfferRepository,
    PrismaTermsVersionRepository,
  ],
})
export class OffersModule {}
