import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { getPair, type PairId } from '../../catalog/catalog';
import { Money } from '../../catalog/money';
import type { TransactionContext } from '../../common/application/transaction.ports';
import type { OfferTermsVersion } from '../domain/offer-terms-version';
import type { TermsVersionRepositoryPort } from '../application/offers.ports';

function getClient(
  prisma: PrismaService,
  transaction?: TransactionContext,
): Prisma.TransactionClient | PrismaService {
  return (transaction as unknown as Prisma.TransactionClient) ?? prisma;
}

@Injectable()
export class PrismaTermsVersionRepository implements TermsVersionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async current(
    offerId: string,
    transaction?: TransactionContext,
  ): Promise<OfferTermsVersion | null> {
    const trimmedId = offerId ? offerId.trim() : '';
    if (!trimmedId) {
      return null;
    }

    const client = getClient(this.prisma, transaction);
    const row = await client.offerTermsVersion.findFirst({
      where: { offerId: trimmedId },
      orderBy: { version: 'desc' },
    });

    if (!row) {
      return null;
    }

    const pair = getPair(row.pairId);
    return Object.freeze({
      id: row.id,
      offerId: row.offerId,
      version: row.version,
      pairId: row.pairId as PairId,
      giveAmount: Money.of(row.giveAmount.toString(), pair.give.asset),
      receiveAmount: Money.of(row.receiveAmount.toString(), pair.receive.asset),
      rate: row.rate ? row.rate.toString() : null,
      marginPct: row.marginPct.toString(),
      minAmount: Money.of(row.minAmount.toString(), pair.give.asset),
      maxAmount: Money.of(row.maxAmount.toString(), pair.give.asset),
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
    });
  }

  async append(
    version: OfferTermsVersion,
    transaction?: TransactionContext,
  ): Promise<void> {
    const client = getClient(this.prisma, transaction);
    await client.offerTermsVersion.create({
      data: {
        id: version.id,
        offerId: version.offerId,
        version: version.version,
        pairId: version.pairId,
        giveAmount: new Prisma.Decimal(version.giveAmount.toDecimalString()),
        receiveAmount: new Prisma.Decimal(
          version.receiveAmount.toDecimalString(),
        ),
        rate: version.rate ? new Prisma.Decimal(version.rate) : null,
        marginPct: new Prisma.Decimal(version.marginPct),
        minAmount: new Prisma.Decimal(version.minAmount.toDecimalString()),
        maxAmount: new Prisma.Decimal(version.maxAmount.toDecimalString()),
        expiresAt: version.expiresAt,
        createdAt: version.createdAt,
      },
    });
  }
}
