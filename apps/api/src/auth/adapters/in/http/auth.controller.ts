import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from '../../../application/auth.service';
import { SessionService } from '../../../application/session.service';
import { CurrentPrincipal, Public } from './auth.decorators';
import type { AuthenticatedPrincipal } from './auth.decorators';
import {
  EmailActionTokenDto,
  IdentifierDto,
  LoginWithPasswordDto,
  PasskeyAuthenticationResponseDto,
  PasskeyRegistrationOptionsDto,
  PasskeyRegistrationResponseDto,
  PhoneVerificationDto,
  PhoneVerificationRequestDto,
  RefreshSessionDto,
  RegisterWithPasswordDto,
  ResetPasswordDto,
  SetPasswordDto,
} from './auth.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly sessions: SessionService,
  ) {}

  @Public()
  @Post('password/register')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  registerWithPassword(@Body() input: RegisterWithPasswordDto) {
    return this.auth.registerWithPassword({
      username: input.username,
      email: input.email,
      displayName: input.displayName,
      password: input.password,
    });
  }

  @Public()
  @Post('password/login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  loginWithPassword(@Body() input: LoginWithPasswordDto) {
    return this.auth.loginWithPassword({
      identifier: input.identifier,
      password: input.password,
    });
  }

  @Public()
  @Post('email/verify')
  @HttpCode(HttpStatus.OK)
  verifyEmail(@Body() input: EmailActionTokenDto) {
    return this.auth.verifyEmail(input.token);
  }

  @Public()
  @Post('password/recovery')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  requestPasswordRecovery(@Body() input: IdentifierDto) {
    return this.auth.requestPasswordRecovery(input.identifier);
  }

  @Public()
  @Post('password/reset')
  @HttpCode(HttpStatus.OK)
  resetPassword(@Body() input: ResetPasswordDto) {
    return this.auth.resetPassword({
      token: input.token,
      newPassword: input.newPassword,
    });
  }

  @Post('password/enroll')
  @HttpCode(HttpStatus.ACCEPTED)
  beginPasswordEnrollment(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Body() input: SetPasswordDto,
  ) {
    return this.auth.beginPasswordEnrollment(principal.userId, {
      username: input.username,
      email: input.email,
      password: input.password,
    });
  }

  @Public()
  @Post('passkeys/registration/options')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  startPasskeyRegistration(@Body() input: PasskeyRegistrationOptionsDto) {
    return this.auth.startPasskeyRegistration(input.displayName);
  }

  @Public()
  @Post('passkeys/registration/verify')
  @HttpCode(HttpStatus.OK)
  completePasskeyRegistration(@Body() input: PasskeyRegistrationResponseDto) {
    return this.auth.completePasskeyRegistration(
      input.operationId,
      input.response,
    );
  }

  @Post('passkeys/add/options')
  startPasskeyEnrollment(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ) {
    return this.auth.startPasskeyRegistration('', principal.userId);
  }

  @Post('passkeys/add/verify')
  @HttpCode(HttpStatus.OK)
  completePasskeyEnrollment(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Body() input: PasskeyRegistrationResponseDto,
  ) {
    return this.auth.completePasskeyRegistration(
      input.operationId,
      input.response,
      principal.userId,
    );
  }

  @Public()
  @Post('passkeys/authentication/options')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  startPasskeyAuthentication() {
    return this.auth.startPasskeyAuthentication();
  }

  @Public()
  @Post('passkeys/authentication/verify')
  @HttpCode(HttpStatus.OK)
  completePasskeyAuthentication(
    @Body() input: PasskeyAuthenticationResponseDto,
  ) {
    return this.auth.completePasskeyAuthentication(
      input.operationId,
      input.response,
    );
  }

  @Public()
  @Post('sessions/refresh')
  @HttpCode(HttpStatus.OK)
  refreshSession(@Body() input: RefreshSessionDto) {
    return this.sessions.refresh(input.refreshToken);
  }

  @Post('sessions/logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  logout(@CurrentPrincipal() principal: AuthenticatedPrincipal) {
    return this.sessions.logout(principal.userId, principal.sessionId);
  }
}

@Controller('users/me/phone-verification')
export class PhoneVerificationController {
  constructor(private readonly auth: AuthService) {}

  @Post('challenges')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  requestPhoneVerification(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Body() input: PhoneVerificationRequestDto,
  ) {
    return this.auth.requestPhoneVerification({
      userId: principal.userId,
      phoneE164: input.phoneE164,
    });
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  verifyPhone(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Body() input: PhoneVerificationDto,
  ) {
    return this.auth.verifyPhone({
      userId: principal.userId,
      phoneE164: input.phoneE164,
      code: input.code,
    });
  }
}
