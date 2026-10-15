import Constants from 'expo-constants';

const DEFAULT_API_BASE_URL = 'http://localhost:3000';

/**
 * `localhost` only works from a simulator on the same machine. Testing on a
 * physical device needs the host's LAN address in `app.json` -> `expo.extra.apiBaseUrl`.
 */
export function resolveApiBaseUrl(): string {
  const configured = Constants.expoConfig?.extra?.apiBaseUrl;
  return typeof configured === 'string' && configured.length > 0
    ? configured
    : DEFAULT_API_BASE_URL;
}
