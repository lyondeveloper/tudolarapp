import { Controller, Get } from '@nestjs/common';
import { CurrentPrincipal } from '../../../../auth/adapters/in/http/auth.decorators';
import type { AuthenticatedPrincipal } from '../../../../auth/adapters/in/http/auth.decorators';
import { UsersService } from '../../../application/users.service';
import type { CurrentUserDto } from './current-user.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  getCurrentUser(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
  ): Promise<CurrentUserDto> {
    return this.users.getCurrentUser(principal.userId);
  }
}
