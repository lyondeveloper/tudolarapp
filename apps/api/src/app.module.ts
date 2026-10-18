import {
  MiddlewareConsumer,
  Module,
  NestModule,
  ValidationPipe,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AllExceptionsFilter } from './common/errors/all-exceptions.filter';
import { RequestIdMiddleware } from './common/errors/request-id.middleware';
import { validateEnvironment } from './config/env.validation';
import { ConversationsModule } from './conversations/conversations.module';
import { DatabaseModule } from './database/database.module';
import { ExchangesModule } from './exchanges/exchanges.module';
import { MarketsModule } from './markets/markets.module';
import { OffersModule } from './offers/offers.module';
import { ReportsModule } from './reports/reports.module';
import { SearchModule } from './search/search.module';
import { SellersModule } from './sellers/sellers.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    DatabaseModule,
    AuthModule,
    UsersModule,
    // The T02 contract modules. Each owns its contracts; their Prisma adapters
    // land with their own backlog tasks (T04, T08–T14). `subscriptions` provides
    // the entitlement port the offers publish gate consumes (ADR-0006, 0014).
    MarketsModule,
    SellersModule,
    SubscriptionsModule,
    OffersModule,
    SearchModule,
    ConversationsModule,
    ExchangesModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useFactory: () =>
        new ValidationPipe({
          transform: true,
          whitelist: true,
          forbidNonWhitelisted: true,
        }),
    },
    // The single envelope for every failure. It is a catch-all filter, so a
    // domain error, an auth error, and Nest's own transport errors all answer
    // through the same shape regardless of registration order.
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
