import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  Query,
} from '@nestjs/common';
import { Public } from '../../../../auth/adapters/in/http/auth.decorators';
import { MarketScoped } from '../../../../common/market-context/market-scoped.decorator';
import type { CursorPage } from '../../../../common/pagination/cursor-pagination';
import {
  SearchOffersUseCase,
  SearchError,
  type SearchOfferItem,
} from '../../../application/search-offers.use-case';
import { SearchOffersQueryDto } from './search-offers.dto';

@Controller('search')
export class SearchController {
  constructor(private readonly searchOffersUseCase: SearchOffersUseCase) {}

  @Public()
  @MarketScoped()
  @Get('offers')
  async searchOffers(
    @Headers('x-market-id') marketId: string,
    @Query() query: SearchOffersQueryDto,
  ): Promise<CursorPage<SearchOfferItem>> {
    try {
      return await this.searchOffersUseCase.execute({
        marketId: marketId ? marketId.trim() : '',
        pairId: query.pairId,
        latitude: query.latitude,
        longitude: query.longitude,
        radiusKm: query.radiusKm,
        amount: query.amount,
        cursor: query.cursor,
        limit: query.limit,
      });
    } catch (err: unknown) {
      if (err instanceof SearchError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }
  }
}
