import {
  Injectable,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';
import {
  assertPostgisInstalled,
  type PostgisProbeRow,
} from './postgis-extension';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnApplicationShutdown
{
  constructor(config: ConfigService) {
    super({
      adapter: new PrismaPg({
        connectionString: config.getOrThrow<string>('DATABASE_URL'),
      }),
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    // Fail loudly at startup when the migration that installs PostGIS has not
    // been applied, rather than with a confusing spatial-query error later.
    await assertPostgisInstalled(() => this.probePostgis());
  }

  async onApplicationShutdown(): Promise<void> {
    await this.$disconnect();
  }

  private probePostgis(): Promise<PostgisProbeRow[]> {
    return this.$queryRaw<PostgisProbeRow[]>`
      SELECT EXISTS (
        SELECT 1 FROM pg_extension WHERE extname = 'postgis'
      ) AS installed
    `;
  }
}
