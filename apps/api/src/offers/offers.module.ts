import { Module } from '@nestjs/common';

/**
 * The offers module. It owns offers, terms versions, quotes, and inventory
 * counters, and it composes the publish gate from two ports (ADR-0006).
 *
 * The terms-version, quote, and agreement-reference contracts already live in
 * `domain/`; this change adds the application ports and the HTTP DTO and
 * registers the module. Its Prisma adapters land with T09, so there is nothing
 * to provide yet.
 */
@Module({})
export class OffersModule {}
