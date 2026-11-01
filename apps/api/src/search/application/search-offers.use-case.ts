import { getPair, isPairId, type PairId } from '../../catalog/catalog';
import type { CursorPage } from '../../common/pagination/cursor-pagination';
import type {
  OfferRepositoryPort,
  TermsVersionRepositoryPort,
} from '../../offers/application/offers.ports';
import type { GeoLocation, OfferStatus } from '../../offers/domain/offer';
import type { SearchCriteria } from '../domain/search-criteria';
import type { SearchQueryPort } from './search.ports';

export enum SearchErrorCode {
  INVALID_COORDINATES = 'INVALID_COORDINATES',
  INVALID_PAIR = 'INVALID_PAIR',
  INVALID_RADIUS = 'INVALID_RADIUS',
  MARKET_ID_REQUIRED = 'MARKET_ID_REQUIRED',
}

export class SearchError extends Error {
  constructor(
    message: string,
    public readonly code: SearchErrorCode,
  ) {
    super(message);
    this.name = 'SearchError';
  }
}

export interface SearchOffersCommand {
  readonly marketId: string;
  readonly pairId?: string;
  readonly latitude?: number;
  readonly longitude?: number;
  readonly radiusKm?: number;
  readonly amount?: string;
  readonly cursor?: string;
  readonly limit?: number;
}

export interface SearchOfferItem {
  readonly id: string;
  readonly pairId: PairId;
  readonly distanceMeters: number | null;
  readonly status: OfferStatus;
  readonly description: string;
  readonly details: string | null;
  readonly location: GeoLocation;
  readonly currentTermsVersionId: string;
  readonly terms: {
    readonly version: number;
    readonly giveAmount: string;
    readonly receiveAmount: string;
    readonly rate: string | null;
    readonly marginPct: string;
    readonly minAmount: string;
    readonly maxAmount: string;
    readonly expiresAt: string;
  };
}

export class SearchOffersUseCase {
  constructor(
    private readonly searchQueryPort: SearchQueryPort,
    private readonly offerRepository: OfferRepositoryPort,
    private readonly termsVersionRepository: TermsVersionRepositoryPort,
  ) {}

  async execute(
    command: SearchOffersCommand,
  ): Promise<CursorPage<SearchOfferItem>> {
    const trimmedMarketId = command.marketId ? command.marketId.trim() : '';
    if (!trimmedMarketId) {
      throw new SearchError(
        'Market ID is required for search operations',
        SearchErrorCode.MARKET_ID_REQUIRED,
      );
    }

    if (command.pairId !== undefined && command.pairId !== null) {
      const trimmedPairId = command.pairId.trim();
      if (trimmedPairId && !isPairId(trimmedPairId)) {
        throw new SearchError(
          `Pair ${trimmedPairId} is not part of the MVP catalog`,
          SearchErrorCode.INVALID_PAIR,
        );
      }
    }

    if (command.latitude !== undefined && command.latitude !== null) {
      if (
        !Number.isFinite(command.latitude) ||
        command.latitude < -90 ||
        command.latitude > 90
      ) {
        throw new SearchError(
          `Latitude must be between -90 and 90; received ${command.latitude}`,
          SearchErrorCode.INVALID_COORDINATES,
        );
      }
    }

    if (command.longitude !== undefined && command.longitude !== null) {
      if (
        !Number.isFinite(command.longitude) ||
        command.longitude < -180 ||
        command.longitude > 180
      ) {
        throw new SearchError(
          `Longitude must be between -180 and 180; received ${command.longitude}`,
          SearchErrorCode.INVALID_COORDINATES,
        );
      }
    }

    if (command.radiusKm !== undefined && command.radiusKm !== null) {
      if (
        !Number.isFinite(command.radiusKm) ||
        command.radiusKm <= 0 ||
        command.radiusKm > 50
      ) {
        throw new SearchError(
          `Radius must be a positive number up to 50 km; received ${command.radiusKm}`,
          SearchErrorCode.INVALID_RADIUS,
        );
      }
    }

    const hasCoordinates =
      command.latitude !== undefined &&
      command.latitude !== null &&
      command.longitude !== undefined &&
      command.longitude !== null;

    const validatedPairId =
      command.pairId && isPairId(command.pairId.trim())
        ? (command.pairId.trim() as PairId)
        : null;

    const criteria: SearchCriteria = {
      intent: 'search_offer',
      pairId: validatedPairId,
      amount: command.amount
        ? {
            value: command.amount,
            asset: validatedPairId
              ? getPair(validatedPairId).give.asset
              : 'VES',
          }
        : null,
      location: hasCoordinates
        ? {
            hintText: null,
            radiusKm: command.radiusKm ?? 5,
            latitude: command.latitude,
            longitude: command.longitude,
          }
        : null,
      unresolved: [],
      confidence: { direction: 1, amount: 1, location: 1 },
    };

    const searchMatches = await this.searchQueryPort.search(
      criteria,
      { limit: command.limit, cursor: command.cursor },
      trimmedMarketId,
    );

    const items: SearchOfferItem[] = [];
    for (const match of searchMatches.items) {
      const offer = await this.offerRepository.findById(match.offerId);
      if (!offer) {
        continue;
      }

      const terms = await this.termsVersionRepository.current(offer.id);
      if (!terms) {
        continue;
      }

      items.push({
        id: offer.id,
        pairId: terms.pairId,
        distanceMeters: match.distanceMeters,
        status: offer.status as OfferStatus,
        description: offer.description,
        details: offer.details,
        location: offer.location ?? { latitude: 0, longitude: 0 },
        currentTermsVersionId: terms.id,
        terms: {
          version: terms.version,
          giveAmount: terms.giveAmount.toDecimalString(),
          receiveAmount: terms.receiveAmount.toDecimalString(),
          rate: terms.rate,
          marginPct: terms.marginPct,
          minAmount: terms.minAmount.toDecimalString(),
          maxAmount: terms.maxAmount.toDecimalString(),
          expiresAt: terms.expiresAt.toISOString(),
        },
      });
    }

    return {
      items,
      nextCursor: searchMatches.nextCursor,
    };
  }
}
