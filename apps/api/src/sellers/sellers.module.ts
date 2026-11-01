import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SELLER_ELIGIBILITY_PORT } from './application/sellers.ports';
import { SellerService } from './application/seller.service';
import { PrismaSellerRepository } from './adapters/out/persistence/prisma-seller.repository';
import { SellerController } from './adapters/in/http/seller.controller';

/**
 * The sellers module. It owns `SellerEligibility` — a state, never an account
 * type (ADR-0016) — and the `SellerEligibilityPort` the offers publish gate
 * consumes (ADR-0006).
 */
@Module({
  imports: [AuthModule],
  controllers: [SellerController],
  providers: [
    PrismaSellerRepository,
    {
      provide: SELLER_ELIGIBILITY_PORT,
      useExisting: PrismaSellerRepository,
    },
    SellerService,
  ],
  exports: [SELLER_ELIGIBILITY_PORT, PrismaSellerRepository, SellerService],
})
export class SellersModule {}
