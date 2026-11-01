import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client';
import { PrismaService } from '../../../../database/prisma.service';
import { createMarket, Market, MarketBoundary } from '../../../domain/market';
import type {
  MarketPoint,
  MarketRepositoryPort,
} from '../../../application/markets.ports';

interface RawMarketRow {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  attribution: string | null;
  geojson: string;
}

@Injectable()
export class PrismaMarketRepository implements MarketRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async exists(marketId: string): Promise<boolean> {
    const trimmedId = marketId ? marketId.trim() : '';
    if (!trimmedId) {
      return false;
    }

    const rows = await this.prisma.$queryRaw<Array<{ exists: boolean }>>(
      Prisma.sql`
        SELECT EXISTS(
          SELECT 1 FROM markets
          WHERE id = ${trimmedId} AND is_active = true
        ) AS "exists"
      `,
    );

    return Boolean(rows[0]?.exists);
  }

  async findById(marketId: string): Promise<Market | null> {
    const trimmedId = marketId ? marketId.trim() : '';
    if (!trimmedId) {
      return null;
    }

    const rows = await this.prisma.$queryRaw<RawMarketRow[]>(
      Prisma.sql`
        SELECT
          id,
          name,
          description,
          is_active,
          attribution,
          ST_AsGeoJSON(boundary) AS geojson
        FROM markets
        WHERE id = ${trimmedId}
      `,
    );

    if (rows.length === 0) {
      return null;
    }

    return this.mapToDomain(rows[0]);
  }

  async findAllActive(): Promise<Market[]> {
    const rows = await this.prisma.$queryRaw<RawMarketRow[]>(
      Prisma.sql`
        SELECT
          id,
          name,
          description,
          is_active,
          attribution,
          ST_AsGeoJSON(boundary) AS geojson
        FROM markets
        WHERE is_active = true
        ORDER BY name ASC
      `,
    );

    return rows.map((row) => this.mapToDomain(row));
  }

  async containsPoint(marketId: string, point: MarketPoint): Promise<boolean> {
    const trimmedId = marketId ? marketId.trim() : '';
    if (!trimmedId) {
      return false;
    }

    if (
      typeof point.longitude !== 'number' ||
      typeof point.latitude !== 'number' ||
      isNaN(point.longitude) ||
      isNaN(point.latitude) ||
      point.longitude < -180 ||
      point.longitude > 180 ||
      point.latitude < -90 ||
      point.latitude > 90
    ) {
      return false;
    }

    const rows = await this.prisma.$queryRaw<Array<{ covered: boolean }>>(
      Prisma.sql`
        SELECT ST_Covers(
          boundary,
          ST_SetSRID(ST_MakePoint(${point.longitude}, ${point.latitude}), 4326)
        ) AS "covered"
        FROM markets
        WHERE id = ${trimmedId}
      `,
    );

    return Boolean(rows[0]?.covered);
  }

  private mapToDomain(row: RawMarketRow): Market {
    const boundary = JSON.parse(row.geojson) as MarketBoundary;
    return createMarket({
      id: row.id,
      name: row.name,
      description: row.description,
      boundary,
      isActive: row.is_active,
      attribution: row.attribution,
    });
  }
}
