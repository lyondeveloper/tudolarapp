/**
 * Canonical MVP pair, asset, rail, and Ciudad Ojeda corridor catalog, plus pure
 * domain calculation and deterministic filter helpers.
 *
 * Aligns with ADR-0005, ADR-0008, ADR-0009, ADR-0010, ADR-0013, ADR-0015,
 * ADR-0017, and ADR-0018. Contains no React, network, or literal colour
 * dependencies.
 */

export const MVP_ASSETS = ['VES', 'USD', 'USDT'] as const;
export type MvpAsset = (typeof MVP_ASSETS)[number];

export const MVP_RAILS = [
  'VES_CASH',
  'VES_BANK_TRANSFER',
  'USD_CASH',
  'USDT_TRANSFER',
] as const;
export type MvpRail = (typeof MVP_RAILS)[number];

export const CANONICAL_PAIR_IDS = [
  'VES_USDT',
  'VES_BANK_TO_VES_CASH',
  'VES_USD_CASH',
  'USDT_VES',
  'USDT_USD_CASH',
] as const;
export type CanonicalPairId = (typeof CANONICAL_PAIR_IDS)[number];

export interface PairDefinition {
  id: CanonicalPairId;
  label: string;
  shortLabel: string;
  giveAsset: MvpAsset;
  receiveAsset: MvpAsset;
  giveRail: MvpRail;
  receiveRail: MvpRail;
  requiresMeeting: boolean;
  sameAsset: boolean;
}

export const CANONICAL_PAIRS: Record<CanonicalPairId, PairDefinition> = {
  VES_USDT: {
    id: 'VES_USDT',
    label: 'VES Efectivo ⇄ USDT Transferencia',
    shortLabel: 'VES → USDT',
    giveAsset: 'VES',
    receiveAsset: 'USDT',
    giveRail: 'VES_CASH',
    receiveRail: 'USDT_TRANSFER',
    requiresMeeting: false,
    sameAsset: false,
  },
  VES_BANK_TO_VES_CASH: {
    id: 'VES_BANK_TO_VES_CASH',
    label: 'VES Transferencia/Pago Móvil ⇄ VES Efectivo',
    shortLabel: 'VES Banco → VES Efectivo',
    giveAsset: 'VES',
    receiveAsset: 'VES',
    giveRail: 'VES_BANK_TRANSFER',
    receiveRail: 'VES_CASH',
    requiresMeeting: true,
    sameAsset: true,
  },
  VES_USD_CASH: {
    id: 'VES_USD_CASH',
    label: 'USD Efectivo ⇄ VES Pago Móvil / Transferencia',
    shortLabel: 'VES ⇄ USD Efectivo',
    giveAsset: 'USD',
    receiveAsset: 'VES',
    giveRail: 'USD_CASH',
    receiveRail: 'VES_BANK_TRANSFER',
    requiresMeeting: true,
    sameAsset: false,
  },
  USDT_VES: {
    id: 'USDT_VES',
    label: 'USDT Transferencia ⇄ VES Efectivo',
    shortLabel: 'USDT → VES',
    giveAsset: 'USDT',
    receiveAsset: 'VES',
    giveRail: 'USDT_TRANSFER',
    receiveRail: 'VES_CASH',
    requiresMeeting: false,
    sameAsset: false,
  },
  USDT_USD_CASH: {
    id: 'USDT_USD_CASH',
    label: 'USDT Transferencia ⇄ USD Efectivo Físico',
    shortLabel: 'USDT → USD Efectivo',
    giveAsset: 'USDT',
    receiveAsset: 'USD',
    giveRail: 'USDT_TRANSFER',
    receiveRail: 'USD_CASH',
    requiresMeeting: true,
    sameAsset: false,
  },
};

export interface SafeCorridor {
  id: string;
  name: string;
  sector: string;
  scheduleLabel: string;
  securityNotes: readonly string[];
}

export const CIUDAD_OJEDA_CORRIDORS: readonly SafeCorridor[] = [
  {
    id: 'ojeda-mall',
    name: 'Av. Intercomunal / CC Ojeda Mall',
    sector: 'Corredor Intercomunal',
    scheduleLabel: 'Lunes a Sábado, 9:00 AM – 4:00 PM',
    securityNotes: ['Circuito Cerrado', 'Zona Iluminada', 'Vigilancia activa'],
  },
  {
    id: 'plaza-bolivar',
    name: 'Plaza Bolívar / Casco Central',
    sector: 'Casco Central',
    scheduleLabel: 'Lunes a Sábado, 8:30 AM – 4:00 PM',
    securityNotes: ['Área bancaria', 'Alta presencia peatonal'],
  },
  {
    id: 'las-morochas',
    name: 'Sector Las Morochas / Arterial 7',
    sector: 'Las Morochas',
    scheduleLabel: 'Lunes a Sábado, 9:00 AM – 4:00 PM',
    securityNotes: ['Corredor comercial', 'Frente a farmacia principal'],
  },
  {
    id: 'tamare-campo-lindo',
    name: 'Tamare / Campo Lindo',
    sector: 'Norte Lagunillas',
    scheduleLabel: 'Lunes a Viernes, 9:00 AM – 3:30 PM',
    securityNotes: ['Punto diurno visible'],
  },
] as const;

export interface PreviewOffer {
  id: string;
  code: string;
  marketId: 'ciudad-ojeda';
  isPreviewData: true;
  sellerDisplayName: string;
  sellerInitials: string;
  sellerMemberSince: string;
  sellerVerificationBadge: string;
  sellerProtectedPhone: string;
  pairId: CanonicalPairId;
  operationHeadline: string;
  rate: number | null;
  rateUnitLabel: string;
  marginPercent: number;
  minAmount: number;
  maxAmount: number;
  amountAsset: MvpAsset;
  rails: readonly MvpRail[];
  railLabels: readonly string[];
  corridorId: string;
  corridorLabel: string;
  distanceKm: number;
  distanceLabel: string;
  updatedAgoLabel: string;
  conditionsSummary: string;
  conditionTags: readonly string[];
  ctaLabel: string;
}

export function formatTabularAmount(amount: number): string {
  const roundedCents = Math.round(amount * 100);
  const whole = Math.floor(Math.abs(roundedCents) / 100);
  const cents = Math.abs(roundedCents) % 100;
  const wholeStr = String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const centsStr = String(cents).padStart(2, '0');
  return `${amount < 0 ? '-' : ''}${wholeStr},${centsStr}`;
}

export interface CalculateReceiveRangeInput {
  pairId: CanonicalPairId;
  minGiveAmount: number;
  maxGiveAmount: number;
  rate: number | null;
  marginPercent: number;
}

export interface ReceiveRangeResult {
  minReceiveFormatted: string;
  maxReceiveFormatted: string;
  receiveAsset: MvpAsset;
}

export function calculateReceiveRange(
  input: CalculateReceiveRangeInput,
): ReceiveRangeResult {
  const pair = CANONICAL_PAIRS[input.pairId];
  const boundedMargin = Math.max(0, Math.min(99.99, input.marginPercent));
  const marginFactor = (100 - boundedMargin) / 100;

  if (pair.sameAsset) {
    const minReceive = Math.round(input.minGiveAmount * marginFactor * 100) / 100;
    const maxReceive = Math.round(input.maxGiveAmount * marginFactor * 100) / 100;
    return {
      minReceiveFormatted: formatTabularAmount(minReceive),
      maxReceiveFormatted: formatTabularAmount(maxReceive),
      receiveAsset: pair.receiveAsset,
    };
  }

  const effectiveRate = input.rate && input.rate > 0 ? input.rate : 0;
  const minReceive =
    Math.round(input.minGiveAmount * effectiveRate * marginFactor * 100) / 100;
  const maxReceive =
    Math.round(input.maxGiveAmount * effectiveRate * marginFactor * 100) / 100;

  return {
    minReceiveFormatted: formatTabularAmount(minReceive),
    maxReceiveFormatted: formatTabularAmount(maxReceive),
    receiveAsset: pair.receiveAsset,
  };
}

export interface OfferDraftInput {
  pairId: CanonicalPairId;
  rate: number | null;
  marginPercent: number;
  minAmount: number;
  maxAmount: number;
  rails: readonly MvpRail[];
  corridorId: string;
}

export interface OfferDraftValidationResult {
  valid: boolean;
  errors: {
    rate?: string;
    marginPercent?: string;
    limits?: string;
    rails?: string;
    corridorId?: string;
  };
}

export function validateOfferDraft(
  draft: OfferDraftInput,
): OfferDraftValidationResult {
  const pair = CANONICAL_PAIRS[draft.pairId];
  const errors: OfferDraftValidationResult['errors'] = {};

  if (!pair.sameAsset && (!draft.rate || draft.rate <= 0)) {
    errors.rate = 'Ingresa una tasa mayor a 0 definida por ti';
  }

  if (draft.marginPercent < 0 || draft.marginPercent >= 100) {
    errors.marginPercent = 'El margen porcentual debe estar entre 0 y menor a 100';
  }

  if (
    !Number.isFinite(draft.minAmount) ||
    !Number.isFinite(draft.maxAmount) ||
    draft.minAmount <= 0 ||
    draft.minAmount > draft.maxAmount
  ) {
    errors.limits =
      'El monto mínimo debe ser mayor a 0 y menor o igual al máximo';
  }

  if (!draft.rails || draft.rails.length === 0) {
    errors.rails = 'Selecciona al menos un medio de pago';
  }

  if (!draft.corridorId || draft.corridorId.trim().length === 0) {
    errors.corridorId = 'Selecciona un punto de encuentro público seguro';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export interface OfferFilterCriteria {
  pairId?: CanonicalPairId | 'ALL';
  rail?: MvpRail | 'ALL';
  amount?: number | null;
  corridorId?: string | 'ALL';
  maxDistanceKm?: number | null;
}

export function filterOffers(
  offers: readonly PreviewOffer[],
  criteria: OfferFilterCriteria,
): PreviewOffer[] {
  return offers.filter((offer) => {
    if (criteria.pairId && criteria.pairId !== 'ALL') {
      if (offer.pairId !== criteria.pairId) return false;
    }
    if (criteria.rail && criteria.rail !== 'ALL') {
      if (!offer.rails.includes(criteria.rail)) return false;
    }
    if (
      typeof criteria.amount === 'number' &&
      Number.isFinite(criteria.amount) &&
      criteria.amount > 0
    ) {
      if (
        criteria.amount < offer.minAmount ||
        criteria.amount > offer.maxAmount
      ) {
        return false;
      }
    }
    if (criteria.corridorId && criteria.corridorId !== 'ALL') {
      if (offer.corridorId !== criteria.corridorId) return false;
    }
    if (
      typeof criteria.maxDistanceKm === 'number' &&
      Number.isFinite(criteria.maxDistanceKm) &&
      criteria.maxDistanceKm > 0
    ) {
      if (offer.distanceKm > criteria.maxDistanceKm) return false;
    }
    return true;
  });
}
