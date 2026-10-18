import { Module } from '@nestjs/common';

/**
 * The exchanges module. It owns agreements, incidents, and the state machine
 * (design.md, module table).
 *
 * This change freezes its contracts and registers the module. Its Prisma adapter
 * lands with T13, so there is nothing to provide yet.
 */
@Module({})
export class ExchangesModule {}
