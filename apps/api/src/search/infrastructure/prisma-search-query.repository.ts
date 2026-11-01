import { Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { kilometresToMeters } from '../../database/spatial/proximity-filter';
import {
  paginate,
  type CursorOptions,
  type CursorPage,
  type PageQuery,
} from '../../common/pagination/cursor-pagination';
import type { SearchCriteria } from '../domain/search-criteria';
import type { SearchMatch, SearchQueryPort } from '../application/search.ports';

interface RawSearchRow {
  offerId: string;
  distanceMeters: number | null;
}

@Injectable()
export class PrismaSearchQueryRepository implements SearchQueryPort {
  constructor(private readonly prisma: PrismaService) {}

  async search(
    criteria: SearchCriteria,
    page: PageQuery,
    marketId: string,
  ): Promise<CursorPage<SearchMatch>> {
    const trimmedMarketId = marketId ? marketId.trim() : '';
    const loc = criteria.location;
    const hasCoordinates =
      loc !== null &&
      loc !== undefined &&
      typeof loc.latitude === 'number' &&
      typeof loc.longitude === 'number' &&
      Number.isFinite(loc.latitude) &&
      Number.isFinite(loc.longitude);

    let rows: RawSearchRow[];

    if (hasCoordinates) {
      const radiusKm =
        loc.radiusKm && loc.radiusKm > 0 ? Math.min(loc.radiusKm, 50) : 5;
      const radiusMeters = kilometresToMeters(radiusKm);
      const pointSql = Prisma.sql`ST_SetSRID(ST_MakePoint(${loc.longitude}, ${loc.latitude}), 4326)::geography`;

      rows = await this.prisma.$queryRaw<RawSearchRow[]>(
        Prisma.sql`
          SELECT
            o.id AS "offerId",
            ROUND(ST_Distance(o.location::geography, ${pointSql})::numeric, 1)::double precision AS "distanceMeters"
          FROM offers o
          JOIN offer_terms_versions t ON t.id = o.current_terms_version_id
          WHERE o.market_id = ${trimmedMarketId}
            AND o.status = 'active'
            ${criteria.pairId ? Prisma.sql`AND t.pair_id = ${criteria.pairId}` : Prisma.empty}
            ${
              criteria.amount
                ? Prisma.sql`AND t.min_amount <= ${criteria.amount.value}::decimal(24, 6) AND t.max_amount >= ${criteria.amount.value}::decimal(24, 6)`
                : Prisma.empty
            }
            AND ST_DWithin(o.location::geography, ${pointSql}, ${radiusMeters})
          ORDER BY "distanceMeters" ASC, o.id ASC
        `,
      );
    } else {
      rows = await this.prisma.$queryRaw<RawSearchRow[]>(
        Prisma.sql`
          SELECT
            o.id AS "offerId",
            NULL::double precision AS "distanceMeters"
          FROM offers o
          JOIN offer_terms_versions t ON t.id = o.current_terms_version_id
          WHERE o.market_id = ${trimmedMarketId}
            AND o.status = 'active'
            ${criteria.pairId ? Prisma.sql`AND t.pair_id = ${criteria.pairId}` : Prisma.empty}
            ${
              criteria.amount
                ? Prisma.sql`AND t.min_amount <= ${criteria.amount.value}::decimal(24, 6) AND t.max_amount >= ${criteria.amount.value}::decimal(24, 6)`
                : Prisma.empty
            }
          ORDER BY o.created_at DESC, o.id ASC
        `,
      );
    }

    const options: CursorOptions<SearchMatch> = {
      compare: (a, b) => {
        if (a.distanceMeters !== null && b.distanceMeters !== null) {
          if (a.distanceMeters !== b.distanceMeters) {
            return a.distanceMeters - b.distanceMeters;
          }
        }
        return a.offerId.localeCompare(b.offerId);
      },
      cursorOf: (item) => ({
        k:
          item.distanceMeters !== null
            ? String(Math.round(item.distanceMeters))
            : '0',
        i: item.offerId,
      }),
      compareCursor: (item, cursor) => {
        const itemDist =
          item.distanceMeters !== null ? Math.round(item.distanceMeters) : 0;
        const cursorDist = Number(cursor.k);
        if (itemDist !== cursorDist) {
          return itemDist - cursorDist;
        }
        return item.offerId.localeCompare(cursor.i);
      },
    };

    return paginate(rows, page, options);
  }
}
