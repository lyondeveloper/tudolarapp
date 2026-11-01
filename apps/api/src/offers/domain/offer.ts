import { Money } from '../../catalog/money';

export type OfferStatus = 'active' | 'paused' | 'exhausted' | 'cancelled';

export const VALID_OFFER_STATUSES: readonly OfferStatus[] = [
  'active',
  'paused',
  'exhausted',
  'cancelled',
];

export class OfferError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OfferError';
  }
}

export interface GeoLocation {
  readonly latitude: number;
  readonly longitude: number;
}

export interface Offer {
  readonly id: string;
  readonly marketId: string;
  readonly sellerId: string;
  readonly status: OfferStatus;
  readonly description: string;
  readonly details: string | null;
  readonly currentTermsVersionId: string | null;
  readonly initialAmount: Money;
  readonly reservedAmount: Money;
  readonly completedAmount: Money;
  readonly availableAmount: Money;
  readonly location: GeoLocation;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

export interface CreateOfferProps {
  readonly id: string;
  readonly marketId: string;
  readonly sellerId: string;
  readonly status: OfferStatus;
  readonly description: string;
  readonly details: string | null;
  readonly currentTermsVersionId: string | null;
  readonly initialAmount: Money;
  readonly reservedAmount?: Money;
  readonly completedAmount?: Money;
  readonly location: GeoLocation;
  readonly createdAt?: Date;
  readonly updatedAt?: Date;
}

export function createOffer(props: CreateOfferProps): Offer {
  if (!VALID_OFFER_STATUSES.includes(props.status)) {
    throw new OfferError(`Invalid offer status: ${props.status}`);
  }

  if (props.initialAmount.minorUnits <= 0n) {
    throw new OfferError('Initial amount must be positive');
  }

  const reserved =
    props.reservedAmount ?? Money.of('0', props.initialAmount.asset);
  const completed =
    props.completedAmount ?? Money.of('0', props.initialAmount.asset);

  if (reserved.asset !== props.initialAmount.asset) {
    throw new OfferError('Reserved amount asset does not match initial amount');
  }

  if (completed.asset !== props.initialAmount.asset) {
    throw new OfferError(
      'Completed amount asset does not match initial amount',
    );
  }

  if (reserved.minorUnits < 0n || completed.minorUnits < 0n) {
    throw new OfferError('Reserved and completed amounts must be non-negative');
  }

  const totalCommitted = reserved.add(completed);
  if (totalCommitted.minorUnits > props.initialAmount.minorUnits) {
    throw new OfferError(
      'Reserved plus completed amount exceeds initial amount',
    );
  }

  const { latitude, longitude } = props.location;
  if (
    typeof latitude !== 'number' ||
    Number.isNaN(latitude) ||
    latitude < -90 ||
    latitude > 90
  ) {
    throw new OfferError(
      `Latitude must be between -90 and 90 degrees; received ${latitude}`,
    );
  }

  if (
    typeof longitude !== 'number' ||
    Number.isNaN(longitude) ||
    longitude < -180 ||
    longitude > 180
  ) {
    throw new OfferError(
      `Longitude must be between -180 and 180 degrees; received ${longitude}`,
    );
  }

  const availableAmount = props.initialAmount.subtract(totalCommitted);

  return Object.freeze({
    id: props.id,
    marketId: props.marketId,
    sellerId: props.sellerId,
    status: props.status,
    description: props.description,
    details: props.details,
    currentTermsVersionId: props.currentTermsVersionId,
    initialAmount: props.initialAmount,
    reservedAmount: reserved,
    completedAmount: completed,
    availableAmount,
    location: Object.freeze({ latitude, longitude }),
    createdAt: props.createdAt,
    updatedAt: props.updatedAt,
  });
}
