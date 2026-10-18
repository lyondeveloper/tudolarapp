import { Module } from '@nestjs/common';

/**
 * The reports module. It owns reports, blocks, and moderation (design.md, module
 * table).
 *
 * This change freezes its contracts and registers the module. Its Prisma adapter
 * lands with T14, so there is nothing to provide yet.
 */
@Module({})
export class ReportsModule {}
