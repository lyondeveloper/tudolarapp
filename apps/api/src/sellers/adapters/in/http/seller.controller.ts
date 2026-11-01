import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import { SellerService } from '../../../application/seller.service';
import {
  CurrentPrincipal,
  Public,
  type AuthenticatedPrincipal,
} from '../../../../auth/adapters/in/http/auth.decorators';
import {
  toSellerEligibilityDto,
  toPublicSellerProfileDto,
  type SellerEligibilityDto,
  type PublicSellerProfileDto,
} from './seller.dto';

@Controller('sellers')
export class SellerController {
  constructor(private readonly sellers: SellerService) {}

  @Get('me/eligibility')
  async getMyEligibility(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ): Promise<SellerEligibilityDto> {
    const eligibility = await this.sellers.getEligibility(principal.userId);
    return toSellerEligibilityDto(eligibility);
  }

  @Post('onboard')
  @HttpCode(HttpStatus.OK)
  async onboard(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ): Promise<SellerEligibilityDto> {
    const eligibility = await this.sellers.onboard(principal.userId);
    return toSellerEligibilityDto(eligibility);
  }

  @Public()
  @Get(':id/profile')
  async getPublicProfile(
    @Param('id') id: string,
  ): Promise<PublicSellerProfileDto> {
    const profile = await this.sellers.getPublicProfile(id);
    return toPublicSellerProfileDto(profile);
  }
}
