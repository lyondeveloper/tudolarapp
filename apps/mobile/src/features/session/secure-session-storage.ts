import * as SecureStore from 'expo-secure-store';

const REFRESH_TOKEN_KEY = 'tudolar.session.refreshToken';

/**
 * Only the refresh token is persisted, and only in the platform keystore.
 * The access token stays in memory for the lifetime of the process.
 */
export async function readRefreshToken(): Promise<string | null> {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function writeRefreshToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
}

export async function clearRefreshToken(): Promise<void> {
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}
