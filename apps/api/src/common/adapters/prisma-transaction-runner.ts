import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import type {
  TransactionContext,
  TransactionRunnerPort,
} from '../application/transaction.ports';

@Injectable()
export class PrismaTransactionRunner implements TransactionRunnerPort {
  constructor(private readonly prisma: PrismaService) {}

  async run<T>(
    operation: (transaction: TransactionContext) => Promise<T>,
  ): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      return operation(tx as unknown as TransactionContext);
    });
  }
}
