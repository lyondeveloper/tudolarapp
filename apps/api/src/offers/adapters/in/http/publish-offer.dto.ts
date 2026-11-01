import { Type } from 'class-transformer';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class GeoLocationDto {
  @IsNumber()
  latitude!: number;

  @IsNumber()
  longitude!: number;
}

export class PublishOfferDto {
  @IsString()
  @IsNotEmpty()
  pairId!: string;

  @IsString()
  @IsNotEmpty()
  initialAmount!: string;

  @IsString()
  @IsNotEmpty()
  giveAmount!: string;

  @IsString()
  @IsNotEmpty()
  receiveAmount!: string;

  @IsString()
  @IsNotEmpty()
  minAmount!: string;

  @IsString()
  @IsNotEmpty()
  maxAmount!: string;

  @IsOptional()
  @IsString()
  rate?: string | null;

  @IsString()
  @IsNotEmpty()
  marginPct!: string;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsOptional()
  @IsString()
  details?: string | null;

  @ValidateNested()
  @Type(() => GeoLocationDto)
  location!: GeoLocationDto;

  @IsOptional()
  @IsString()
  expiresAt?: string;
}
