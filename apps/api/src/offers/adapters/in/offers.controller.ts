import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UnprocessableEntityException,
} from '@nestjs/common';
import { getPair, isPairId } from '../../../catalog/catalog';
import { Money } from '../../../catalog/money';
import {
  CurrentPrincipal,
  type AuthenticatedPrincipal,
} from '../../../auth/adapters/in/http/auth.decorators';
import { MarketScoped } from '../../../common/market-context/market-scoped.decorator';
import {
  PublishOfferUseCase,
  PublishOfferError,
  PublishOfferErrorCode,
} from '../../application/publish-offer.use-case';
import { PublishOfferDto } from './http/publish-offer.dto';
import { toOfferDto, type OfferDto } from './http/offer.dto';
import type { GeoLocation, OfferStatus } from '../../domain/offer';

export interface PublishedOfferResponseDto extends OfferDto {
  status: OfferStatus;
  description: string;
  details: string | null;
  location: GeoLocation;
}

@Controller('offers')
export class OffersController {
  constructor(private readonly publishOfferUseCase: PublishOfferUseCase) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @MarketScoped()
  async publishOffer(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Headers('x-market-id') marketId: string,
    @Body() dto: PublishOfferDto,
  ): Promise<PublishedOfferResponseDto> {
    if (!isPairId(dto.pairId)) {
      throw new BadRequestException(
        `Pair ${dto.pairId} is not a valid MVP catalog pair`,
      );
    }

    const pair = getPair(dto.pairId);

    try {
      const result = await this.publishOfferUseCase.execute({
        sellerId: principal.userId,
        marketId: marketId ? marketId.trim() : '',
        pairId: dto.pairId,
        initialAmount: Money.of(dto.initialAmount, pair.give.asset),
        giveAmount: Money.of(dto.giveAmount, pair.give.asset),
        receiveAmount: Money.of(dto.receiveAmount, pair.receive.asset),
        minAmount: Money.of(dto.minAmount, pair.give.asset),
        maxAmount: Money.of(dto.maxAmount, pair.give.asset),
        rate: dto.rate ?? null,
        marginPct: dto.marginPct,
        description: dto.description,
        details: dto.details ?? null,
        location: dto.location,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      });

      const baseDto = toOfferDto(result.offer, result.terms);
      return {
        ...baseDto,
        status: result.offer.status,
        description: result.offer.description,
        details: result.offer.details,
        location: result.offer.location,
      };
    } catch (err: unknown) {
      if (err instanceof PublishOfferError) {
        switch (err.code) {
          case PublishOfferErrorCode.SELLER_INELIGIBLE:
          case PublishOfferErrorCode.SELLER_NOT_ENTITLED:
            throw new ForbiddenException(err.message);
          case PublishOfferErrorCode.OUTSIDE_MARKET_BOUNDARY:
            throw new UnprocessableEntityException(err.message);
          case PublishOfferErrorCode.INVALID_PAIR:
          case PublishOfferErrorCode.VALIDATION_ERROR:
          default:
            throw new BadRequestException(err.message);
        }
      }
      throw err;
    }
  }
}
