import { ApiErrorCode } from '../errors/api-error-code';
import { ApplicationError } from '../errors/application-error';

/**
 * Asserts that the requested market scope matches the entity's market.
 *
 * Market isolation is a database and business invariant: operations under market A
 * cannot read, alter, or interact with entities belonging to market B.
 *
 * @throws ApplicationError with ApiErrorCode.MARKET_MISMATCH if markets do not match or are blank.
 */
export function assertMarketMatch(
  requestedMarketId: string | null | undefined,
  entityMarketId: string | null | undefined,
): void {
  const reqId = requestedMarketId?.trim() ?? '';
  const entId = entityMarketId?.trim() ?? '';

  if (!reqId || !entId || reqId !== entId) {
    throw new ApplicationError(ApiErrorCode.MARKET_MISMATCH);
  }
}
