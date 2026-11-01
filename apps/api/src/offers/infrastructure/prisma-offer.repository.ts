import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { getPair } from '../../catalog/catalog';
import { Money } from '../../catalog/money';
import type { TransactionContext } from '../../common/application/transaction.ports';
import { createOffer, type Offer, type OfferStatus } from '../domain/offer';
import type { OfferRepositoryPort } from '../application/offers.ports';

interface RawOfferRow {
  id: string;
  market_id: string;
  seller_id: string;
  status: string;
  description: string;
  details: string | null;
  current_terms_version_id: string | null;
  initial_amount: Prisma.Decimal;
  reserved_amount: Prisma.Decimal;
  completed_amount: Prisma.Decimal;
  latitude: number;
  longitude: number;
  created_at: Date;
  updated_at: Date;
  pair_id: string | null;
}

function getClient(
  prisma: PrismaService,
  transaction?: TransactionContext,
): Prisma.TransactionClient | PrismaService {
  return (transaction as unknown as Prisma.TransactionClient) ?? prisma;
}

@Injectable()
export class PrismaOfferRepository implements OfferRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findById(
    offerId: string,
    transaction?: TransactionContext,
  ): Promise<Offer | null> {
    const trimmedId = offerId ? offerId.trim() : '';
    if (!trimmedId) {
      return null;
    }

    const client = getClient(this.prisma, transaction);
    const rows = await client.$queryRaw<RawOfferRow[]>(
      Prisma.sql`
        SELECT
          o.id,
          o.market_id,
          o.seller_id,
          o.status,
          o.description,
          o.details,
          o.current_terms_version_id,
          o.initial_amount,
          o.reserved_amount,
          o.completed_amount,
          ST_Y(o.location) AS latitude,
          ST_X(o.location) AS longitude,
          o.created_at,
          o.updated_at,
          t.pair_id
        FROM offers o
        LEFT JOIN offer_terms_versions t ON t.id = o.current_terms_version_id
        WHERE o.id = ${trimmedId}::uuid
      `,
    );

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];
    const asset = row.pair_id ? getPair(row.pair_id).give.asset : 'VES';

    return createOffer({
      id: row.id,
      marketId: row.market_id,
      sellerId: row.seller_id,
      status: row.status as OfferStatus,
      description: row.description,
      details: row.details,
      currentTermsVersionId: row.current_terms_version_id,
      initialAmount: Money.of(row.initial_amount.toString(), asset),
      reservedAmount: Money.of(row.reserved_amount.toString(), asset),
      completedAmount: Money.of(row.completed_amount.toString(), asset),
      location: {
        latitude: row.latitude,
        longitude: row.longitude,
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }

  async create(offer: Offer, transaction?: TransactionContext): Promise<void> {
    const client = getClient(this.prisma, transaction);
    const currentTermsUuid = offer.currentTermsVersionId
      ? Prisma.sql`${offer.currentTermsVersionId}::uuid`
      : Prisma.sql`NULL`;

    await client.$executeRaw(
      Prisma.sql`
        INSERT INTO offers (
          id,
          market_id,
          seller_id,
          status,
          description,
          details,
          current_terms_version_id,
          initial_amount,
          reserved_amount,
          completed_amount,
          location,
          created_at,
          updated_at
        ) VALUES (
          ${offer.id}::uuid,
          ${offer.marketId},
          ${offer.sellerId}::uuid,
          ${offer.status},
          ${offer.description},
          ${offer.details},
          ${currentTermsUuid},
          ${offer.initialAmount.toDecimalString()}::decimal(24, 6),
          ${offer.reservedAmount.toDecimalString()}::decimal(24, 6),
          ${offer.completedAmount.toDecimalString()}::decimal(24, 6),
          ST_SetSRID(ST_MakePoint(${offer.location.longitude}, ${offer.location.latitude}), 4326),
          ${offer.createdAt ?? new Date()}::timestamptz,
          ${offer.updatedAt ?? new Date()}::timestamptz
        )
      `,
    );
  }

  async pointAtCurrentVersion(
    offerId: string,
    termsVersionId: string,
    transaction?: TransactionContext,
  ): Promise<void> {
    const client = getClient(this.prisma, transaction);
    await client.$executeRaw(
      Prisma.sql`
        UPDATE offers
        SET current_terms_version_id = ${termsVersionId}::uuid,
            updated_at = NOW()
        WHERE id = ${offerId}::uuid
      `,
    );
  }
}
