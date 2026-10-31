import { CIUDAD_OJEDA_CORRIDORS, type PreviewOffer } from './catalog';

/**
 * Explicit local preview dataset for T15 Stitch screens while backend
 * endpoints T04-T14 are pending.
 *
 * Respects ADR-0008 (seller-set rates), ADR-0009 (only 5 canonical pairs, no
 * Zelle), ADR-0013 (no reputation scores or star ratings), ADR-0017 (5 km
 * default radius in Ciudad Ojeda), and ADR-0018 (no earnings labels).
 */

export const MARKET_NODE_PREVIEW = {
  marketId: 'ciudad-ojeda' as const,
  marketName: 'Ciudad Ojeda',
  municipalityLabel: 'Polígono Lagunillas • Zulia Central',
  defaultRadiusKm: 5,
  geofenceNotice:
    'Este mercado está geocercado estrictamente para entregas presenciales dentro del municipio Lagunillas.',
  upcomingPhasesLabel: 'Cabimas y Maracaibo: Próxima fase piloto',
  isPreviewData: true as const,
};

export const OFFERS_PREVIEW: readonly PreviewOffer[] = [
  {
    id: 'td-892',
    code: 'TD-892',
    marketId: 'ciudad-ojeda',
    isPreviewData: true,
    sellerDisplayName: 'Carlos M.',
    sellerInitials: 'CM',
    sellerMemberSince: 'Miembro de la red desde Agosto 2023',
    sellerVerificationBadge: 'Cuenta activa en Ciudad Ojeda',
    sellerProtectedPhone: '04XX-•••-1984 • Oculto por seguridad comunitaria',
    pairId: 'VES_USD_CASH',
    operationHeadline: 'Vende USD Efectivo ⇄ Recibe Pago Móvil VES',
    rate: 39.2,
    rateUnitLabel: '39,20 VES/USD',
    marginPercent: 0,
    minAmount: 20,
    maxAmount: 250,
    amountAsset: 'USD',
    rails: ['USD_CASH', 'VES_BANK_TRANSFER'],
    railLabels: ['Efectivo Limpio', 'Banesco', 'Pago Móvil Express'],
    corridorId: 'ojeda-mall',
    corridorLabel: 'Av. Intercomunal / CC Ojeda Mall',
    distanceKm: 1.2,
    distanceLabel: 'a 1,2 km',
    updatedAgoLabel: 'Hace 25 min',
    conditionsSummary:
      'Billetes de denominación $20 y $50 en buen estado (sin roturas ni sellos excesivos). Transferencia bancaria inmediata vía Banesco o Pago Móvil verificado en el sitio antes de entregar la divisa.',
    conditionTags: [
      'Efectivo Limpio',
      'Banesco',
      'Pago Móvil Express',
      'Revisión en Mano',
    ],
    ctaLabel: 'Iniciar Conversación',
  },
  {
    id: 'td-904',
    code: 'TD-904',
    marketId: 'ciudad-ojeda',
    isPreviewData: true,
    sellerDisplayName: 'Elena R.',
    sellerInitials: 'ER',
    sellerMemberSince: 'Miembro de la red desde Enero 2024',
    sellerVerificationBadge: 'Punto Vigilado Diurno • Casco Central',
    sellerProtectedPhone: '04XX-•••-4421 • Oculto por seguridad comunitaria',
    pairId: 'VES_USD_CASH',
    operationHeadline: 'Compra USD Efectivo ⇄ Paga Transf. Banesco / Mercantil',
    rate: 39.1,
    rateUnitLabel: '39,10 VES/USD',
    marginPercent: 0,
    minAmount: 50,
    maxAmount: 400,
    amountAsset: 'USD',
    rails: ['VES_BANK_TRANSFER', 'USD_CASH'],
    railLabels: ['Pago Móvil Banesco', 'Mercantil', 'USD Efectivo'],
    corridorId: 'plaza-bolivar',
    corridorLabel: 'Plaza Bolívar / Casco Central',
    distanceKm: 0.8,
    distanceLabel: 'a 800 m',
    updatedAgoLabel: 'Hace 40 min',
    conditionsSummary:
      'Encuentro diurno frente a sucursal bancaria en Plaza Bolívar. Pago Móvil Banesco o Mercantil inmediato tras verificar billetes.',
    conditionTags: ['Banesco', 'Mercantil', 'Horario Diurno'],
    ctaLabel: 'Proponer Intercambio',
  },
  {
    id: 'td-918',
    code: 'TD-918',
    marketId: 'ciudad-ojeda',
    isPreviewData: true,
    sellerDisplayName: 'Inversiones Ojeda P2P',
    sellerInitials: 'IO',
    sellerMemberSince: 'Operador local en Corredor Arterial 7',
    sellerVerificationBadge: 'Punto Físico con Cámaras Activas',
    sellerProtectedPhone: '04XX-•••-8810 • Oculto por seguridad comunitaria',
    pairId: 'USDT_USD_CASH',
    operationHeadline: 'USDT Transferencia ⇄ USD Efectivo Físico',
    rate: 1.0,
    rateUnitLabel: '1,00 USD/USDT',
    marginPercent: 1.5,
    minAmount: 100,
    maxAmount: 1000,
    amountAsset: 'USD',
    rails: ['USDT_TRANSFER', 'USD_CASH'],
    railLabels: ['USDT Transferencia', 'USD Efectivo Físico', 'Billetes sin roturas'],
    corridorId: 'las-morochas',
    corridorLabel: 'Sector Las Morochas / Arterial 7',
    distanceKm: 2.4,
    distanceLabel: 'a 2,4 km',
    updatedAgoLabel: 'Hace 15 min',
    conditionsSummary:
      'Entrega en punto comercial vigilado en Arterial 7. Billetes verificados en presencia de ambas partes.',
    conditionTags: ['USDT Transferencia', 'Billetes sin roturas', 'Cámaras activas'],
    ctaLabel: 'Contactar Oferente',
  },
] as const;

export interface ChatMessagePreview {
  id: string;
  sender: 'counterparty' | 'self' | 'system';
  authorLabel: string;
  text: string;
  timestamp: string;
}

export const CONVERSATION_PREVIEW = {
  id: 'td-892',
  offerCode: 'TD-892',
  isPreviewData: true as const,
  counterpartyName: 'Carlos M.',
  counterpartyInitials: 'CM',
  counterpartyContext: 'Cuenta activa en Ciudad Ojeda • Teléfono protegido',
  giveSummary: '100,00 USD',
  giveDetail: 'Billetes sanos sin tachaduras',
  receiveSummary: '3.920,00 VES',
  receiveDetail: 'Pago Móvil Banesco (Tasa 39,20)',
  meetingVenue: 'Farmatodo • Av. Intercomunal (CC Ojeda Mall)',
  meetingSafetyNote:
    'Zona iluminada, alta afluencia peatonal y seguridad privada',
  meetingTimeSlot: 'Hoy, 3:30 PM (Horario comercial diurno)',
  counterpartySignedLabel: 'Carlos M. ya aprobó estos términos de cita.',
  verifiedAlternativeVenues: CIUDAD_OJEDA_CORRIDORS,
  messages: [
    {
      id: 'msg-1',
      sender: 'system',
      authorLabel: 'Sistema TUDOLAR',
      text: 'Conversación asociada a la Oferta TD-892 de Carlos M. en Ciudad Ojeda.',
      timestamp: '02:39 PM',
    },
    {
      id: 'msg-2',
      sender: 'counterparty',
      authorLabel: 'Carlos M.',
      text: '¡Hola! Buenas tardes. Sí, tengo disponible para cambiar los 100 USD en billetes de 20 sanos y limpios. ¿Te sirve vernos en Farmatodo de la Av. Intercomunal a las 3:30 PM?',
      timestamp: '02:40 PM',
    },
    {
      id: 'msg-3',
      sender: 'self',
      authorLabel: 'Tú',
      text: 'Perfecto, me queda cerca y es seguro. Llevo los 100 USD exactos y verificamos el Pago Móvil Banesco en el sitio.',
      timestamp: '02:42 PM',
    },
    {
      id: 'msg-4',
      sender: 'counterparty',
      authorLabel: 'Carlos M.',
      text: 'Excelente, ya registré el acuerdo en la tarjeta superior con el punto público para que quede fijada la cita.',
      timestamp: '02:44 PM',
    },
  ] satisfies readonly ChatMessagePreview[],
};

export function findOfferById(id: string | undefined): PreviewOffer {
  if (!id) return OFFERS_PREVIEW[0];
  const normalized = id.toLowerCase();
  return (
    OFFERS_PREVIEW.find((offer) => offer.id.toLowerCase() === normalized) ??
    OFFERS_PREVIEW[0]
  );
}
