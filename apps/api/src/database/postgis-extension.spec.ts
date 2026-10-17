import {
  POSTGIS_INSTALL_MIGRATION,
  assertPostgisInstalled,
} from './postgis-extension';

describe('assertPostgisInstalled', () => {
  it('resolves when PostGIS is installed', async () => {
    await expect(
      assertPostgisInstalled(() => Promise.resolve([{ installed: true }])),
    ).resolves.toBeUndefined();
  });

  it('fails with a message naming the migration that installs PostGIS', async () => {
    await expect(
      assertPostgisInstalled(() => Promise.resolve([{ installed: false }])),
    ).rejects.toThrow(POSTGIS_INSTALL_MIGRATION);
  });

  it('fails when the probe returns no rows', async () => {
    await expect(
      assertPostgisInstalled(() => Promise.resolve([])),
    ).rejects.toThrow(/PostGIS is not installed/);
  });
});
