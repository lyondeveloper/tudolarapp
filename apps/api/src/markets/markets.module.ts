import { Module } from '@nestjs/common';
import { MARKET_CONTEXT_PORT } from '../common/market-context/market-context.port';
import { PrismaMarketRepository } from './adapters/out/persistence/prisma-market.repository';
import { MARKET_REPOSITORY } from './application/markets.ports';

/**
 * The markets module. It owns the market, its polygon, and the market predicate
 * (design.md, module table).
 *
 * T04 integrates the Prisma adapter over the persistent `markets` table,
 * providing both `MARKET_REPOSITORY` and `MARKET_CONTEXT_PORT`.
 */
@Module({
  providers: [
    PrismaMarketRepository,
    {
      provide: MARKET_REPOSITORY,
      useExisting: PrismaMarketRepository,
    },
    {
      provide: MARKET_CONTEXT_PORT,
      useExisting: PrismaMarketRepository,
    },
  ],
  exports: [PrismaMarketRepository, MARKET_REPOSITORY, MARKET_CONTEXT_PORT],
})
export class MarketsModule {}
