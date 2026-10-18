import { Module } from '@nestjs/common';

/**
 * The conversations module. It owns conversations and messages (design.md,
 * module table).
 *
 * This change freezes its contracts and registers the module. Its Prisma adapter
 * lands with T12, so there is nothing to provide yet.
 */
@Module({})
export class ConversationsModule {}
