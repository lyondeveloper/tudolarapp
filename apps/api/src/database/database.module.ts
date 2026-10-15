import {
  Global,
  Injectable,
  Module,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

export const DATABASE_POOL = 'DATABASE_POOL';

@Injectable()
export class PostgresDatabase implements OnApplicationShutdown {
  readonly pool: Pool;

  constructor(config: ConfigService) {
    this.pool = new Pool({
      connectionString: config.getOrThrow<string>('DATABASE_URL'),
      max: 10,
      application_name: 'tudolar-api',
    });
  }

  query<Row extends QueryResultRow = QueryResultRow>(
    text: string,
    values: readonly unknown[] = [],
  ): Promise<QueryResult<Row>> {
    return this.pool.query<Row>(text, [...values]);
  }

  async transaction<Result>(
    work: (client: PoolClient) => Promise<Result>,
  ): Promise<Result> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  onApplicationShutdown(): Promise<void> {
    return this.pool.end();
  }
}

@Global()
@Module({
  providers: [
    PostgresDatabase,
    {
      provide: DATABASE_POOL,
      useFactory: (database: PostgresDatabase) => database.pool,
      inject: [PostgresDatabase],
    },
  ],
  exports: [PostgresDatabase, DATABASE_POOL],
})
export class DatabaseModule {}
