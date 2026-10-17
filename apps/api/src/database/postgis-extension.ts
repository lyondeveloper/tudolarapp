/**
 * Startup assertion that PostGIS is present.
 *
 * Prisma Migrate is the single authority that installs the extension (the
 * `--create-only` migration named by `POSTGIS_INSTALL_MIGRATION`); the
 * application role only ever *verifies* it. A database created without that
 * migration has no PostGIS, and a spatial query would then fail with a confusing
 * error deep inside a request. Asserting at startup turns that into one clear
 * failure that names the migration which installs it.
 *
 * This mirrors `src/config/env.validation.ts`: a small check that throws a plain
 * `Error` with a message that says what is wrong and how to fix it, so the
 * failure is loud and actionable instead of a later query error.
 */

export const POSTGIS_INSTALL_MIGRATION = '20261017190000_add_postgis_extension';

export interface PostgisProbeRow {
  installed: boolean;
}

/**
 * Fails loudly when the probe does not report PostGIS as installed.
 *
 * @param probe Runs `SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis')`
 *   against the target database and resolves with its rows.
 */
export async function assertPostgisInstalled(
  probe: () => Promise<PostgisProbeRow[]>,
): Promise<void> {
  const rows = await probe();
  if (rows[0]?.installed !== true) {
    throw new Error(
      `PostGIS is not installed in this database. It is created by the Prisma migration ` +
        `"${POSTGIS_INSTALL_MIGRATION}". If that migration is already recorded as applied, ` +
        '`prisma migrate deploy` will NOT restore it — re-create the extension as a privileged ' +
        'role (`CREATE EXTENSION postgis;`) or un-record the migration and re-apply it. See ' +
        'docs/testing/e2e.md.',
    );
  }
}
