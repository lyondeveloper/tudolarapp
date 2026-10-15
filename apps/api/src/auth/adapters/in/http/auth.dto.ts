import { Transform } from 'class-transformer';

function trimStringTransform(parameters: unknown): unknown {
  if (
    typeof parameters !== 'object' ||
    parameters === null ||
    !('value' in parameters)
  ) {
    return parameters;
  }
  const value = parameters.value;
  return typeof value === 'string' ? value.trim() : value;
}
import {
  IsEmail,
  IsNotEmpty,
  IsObject,
  IsString,
  Length,
  Matches,
  MaxLength,
} from 'class-validator';

export class RegisterWithPasswordDto {
  @IsString()
  @Matches(/^[a-zA-Z0-9][a-zA-Z0-9._-]{2,31}$/)
  username: string;

  @Transform(trimStringTransform)
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsString()
  @Length(1, 80)
  displayName: string;

  @IsString()
  @Length(12, 128)
  password: string;
}

export class LoginWithPasswordDto {
  @Transform(trimStringTransform)
  @IsString()
  @Length(1, 254)
  identifier: string;

  @IsString()
  @Length(1, 128)
  password: string;
}

export class IdentifierDto {
  @Transform(trimStringTransform)
  @IsString()
  @Length(1, 254)
  identifier: string;
}

export class EmailActionTokenDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  token: string;
}

export class ResetPasswordDto extends EmailActionTokenDto {
  @IsString()
  @Length(12, 128)
  newPassword: string;
}

export class PasskeyRegistrationOptionsDto {
  @IsString()
  @Length(1, 80)
  displayName: string;
}

export class PasskeyRegistrationResponseDto {
  @IsString()
  @IsNotEmpty()
  operationId: string;

  @IsObject()
  response: Record<string, unknown>;
}

export class PasskeyAuthenticationResponseDto {
  @IsString()
  @IsNotEmpty()
  operationId: string;

  @IsObject()
  response: Record<string, unknown>;
}

export class RefreshSessionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  refreshToken: string;
}

export class PhoneVerificationRequestDto {
  @IsString()
  @Matches(/^\+[1-9]\d{7,14}$/)
  phoneE164: string;
}

export class PhoneVerificationDto {
  @IsString()
  @Matches(/^\+[1-9]\d{7,14}$/)
  phoneE164: string;

  @IsString()
  @Matches(/^\d{6,8}$/)
  code: string;
}

export class SetPasswordDto {
  @Matches(/^[a-zA-Z0-9][a-zA-Z0-9._-]{2,31}$/)
  username: string;

  @Transform(trimStringTransform)
  @IsEmail()
  @MaxLength(254)
  email: string;

  @IsString()
  @Length(12, 128)
  password: string;
}
