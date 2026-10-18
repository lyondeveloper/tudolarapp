import { Module } from '@nestjs/common';

/**
 * The sellers module. It owns `SellerEligibility` — a state, never an account
 * type (ADR-0016) — and the `SellerEligibilityPort` the offers publish gate
 * consumes (ADR-0006).
 *
 * This change freezes its contracts and registers the module. Its Prisma adapter
 * lands with T08, so there is nothing to provide yet; no empty provider is
 * declared.
 */
@Module({})
export class SellersModule {}
