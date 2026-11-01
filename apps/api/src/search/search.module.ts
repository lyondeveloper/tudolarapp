import { Module } from '@nestjs/common';
import { MarketsModule } from '../markets/markets.module';
import {
  OFFER_REPOSITORY,
  TERMS_VERSION_REPOSITORY,
} from '../offers/application/offers.ports';
import type {
  OfferRepositoryPort,
  TermsVersionRepositoryPort,
} from '../offers/application/offers.ports';
import { OffersModule } from '../offers/offers.module';
import { SearchController } from './adapters/in/http/search.controller';
import {
  SEARCH_QUERY_PORT,
  type SearchQueryPort,
} from './application/search.ports';
import { SearchOffersUseCase } from './application/search-offers.use-case';
import { PrismaSearchQueryRepository } from './infrastructure/prisma-search-query.repository';

/**
 * The search module. It owns `SearchCriteria` and the deterministic geospatial
 * proximity query adapter (T10).
 *
 * The natural-language parser port is deliberately left unimplemented and
 * wired nowhere (ADR-0015).
 */
@Module({
  imports: [MarketsModule, OffersModule],
  controllers: [SearchController],
  providers: [
    PrismaSearchQueryRepository,
    {
      provide: SEARCH_QUERY_PORT,
      useExisting: PrismaSearchQueryRepository,
    },
    {
      provide: SearchOffersUseCase,
      useFactory: (
        searchQueryPort: SearchQueryPort,
        offerRepo: OfferRepositoryPort,
        termsRepo: TermsVersionRepositoryPort,
      ) => new SearchOffersUseCase(searchQueryPort, offerRepo, termsRepo),
      inject: [SEARCH_QUERY_PORT, OFFER_REPOSITORY, TERMS_VERSION_REPOSITORY],
    },
  ],
  exports: [
    SEARCH_QUERY_PORT,
    SearchOffersUseCase,
    PrismaSearchQueryRepository,
  ],
})
export class SearchModule {}
