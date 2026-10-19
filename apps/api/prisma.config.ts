import 'dotenv/config';
import { config as loadMigrationEnv } from 'dotenv';
import { defineConfig } from 'prisma/config';

// Migration credentials are loaded only by Prisma CLI configuration, never by
// the NestJS runtime's ConfigModule.
loadMigrationEnv({ path: '.env.migration' });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Deliberately not `env(...)`: the postinstall `prisma generate` must work
    // without database credentials. Migration commands use the separate
    // maintenance URL; `DATABASE_URL` remains the API's restricted runtime role.
    url: process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL ?? '',
  },
});
