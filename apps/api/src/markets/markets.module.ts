import { Module } from '@nestjs/common';

/**
 * The markets module. It owns the market, its polygon, and the market predicate
 * (design.md, module table).
 *
 * This change freezes its contracts — the `Market` domain model, the
 * `MarketRepositoryPort` (which also answers `common`'s `MarketContextPort`), the
 * spatial predicate builder, and the `MarketDto` — and registers the module. Its
 * Prisma adapter over the market table lands with T04, so there is nothing to
 * provide yet; the module composes no empty or ceremonial provider.
 */
@Module({})
export class MarketsModule {}
