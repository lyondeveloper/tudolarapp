import { Module } from '@nestjs/common';
import { IDENTITY_REPOSITORY } from '../auth/application/auth.tokens';
import type { IdentityRepositoryPort } from '../auth/application/auth.ports';
import { AuthModule } from '../auth/auth.module';
import { UsersController } from './adapters/in/http/users.controller';
import { UsersService } from './application/users.service';

@Module({
  imports: [AuthModule],
  controllers: [UsersController],
  providers: [
    {
      provide: UsersService,
      useFactory: (identity: IdentityRepositoryPort) =>
        new UsersService(identity),
      inject: [IDENTITY_REPOSITORY],
    },
  ],
})
export class UsersModule {}
