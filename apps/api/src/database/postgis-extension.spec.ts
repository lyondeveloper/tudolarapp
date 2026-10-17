import {
  POSTGIS_INSTALL_MIGRATION,
  assertPostgisInstalled,
} from './postgis-extension';

describe('assertPostgisInstalled', () => {
  it('resolves when PostGIS is installed', async () => {
    await expect(
      assertPostgisInstalled(async () => [{ installed: true }]),
    ).resolves.toBeUndefined();
  });

  it('fails with a message naming the migration that installs PostGIS', async () => {
    await expect(
      assertPostgisInstalled(async () => [{ installed: false }]),
    ).rejects.toThrow(POSTGIS_INSTALL_MIGRATION);
  });

  it('fails when the probe returns no rows', async () => {
    await expect(assertPostgisInstalled(async () => [])).rejects.toThrow(
      /PostGIS is not installed/,
    );
  });
});
