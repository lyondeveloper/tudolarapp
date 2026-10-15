import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Deliberately not `env('DATABASE_URL')`: that helper throws while the
    // config is loading, which would break `prisma generate` (run from the
    // postinstall hook) for anyone who has not created a `.env` yet. Commands
    // that actually connect still fail loudly, just later.
    url: process.env.DATABASE_URL ?? '',
  },
});
