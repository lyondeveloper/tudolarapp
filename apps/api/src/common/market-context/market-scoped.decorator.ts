import { applyDecorators, UseGuards } from '@nestjs/common';
import { MarketContextGuard } from './market-context.guard';

/**
 * Opt-in marker for a market-scoped route. The guard is **not** registered
 * globally, so health and auth stay market-free; a route becomes market-scoped
 * only by declaring this decorator (or `@UseGuards(MarketContextGuard)`).
 */
export const MarketScoped = () =>
  applyDecorators(UseGuards(MarketContextGuard));
