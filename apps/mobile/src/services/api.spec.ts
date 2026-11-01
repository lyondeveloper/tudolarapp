import { api, prepareApiHeaders } from './api';
import type { RootState } from '@/store';

describe('api phone verification endpoints', () => {
  it('defines requestPhoneVerification mutation endpoint', () => {
    expect(api.endpoints.requestPhoneVerification).toBeDefined();
    const endpoint = api.endpoints.requestPhoneVerification;
    const queryResult = (
      endpoint as unknown as {
        initiate: (arg: unknown) => unknown;
      }
    ).initiate({ phoneE164: '+584141234567' });
    expect(queryResult).toBeDefined();
  });

  it('defines verifyPhone mutation endpoint', () => {
    expect(api.endpoints.verifyPhone).toBeDefined();
    const endpoint = api.endpoints.verifyPhone;
    const queryResult = (
      endpoint as unknown as {
        initiate: (arg: unknown) => unknown;
      }
    ).initiate({ phoneE164: '+584141234567', code: '123456' });
    expect(queryResult).toBeDefined();
  });
});

describe('prepareApiHeaders', () => {
  it('injects Authorization header when accessToken exists', () => {
    const headers = new Headers();
    const mockState = {
      session: { accessToken: 'test-access-token' },
      market: { activeMarketId: null },
    } as unknown as RootState;

    const result = prepareApiHeaders(headers, { getState: () => mockState });

    expect(result.get('Authorization')).toBe('Bearer test-access-token');
    expect(result.has('X-Market-Id')).toBe(false);
  });

  it('injects X-Market-Id header when activeMarketId is present', () => {
    const headers = new Headers();
    const mockState = {
      session: { accessToken: null },
      market: { activeMarketId: 'ciudad-ojeda' },
    } as unknown as RootState;

    const result = prepareApiHeaders(headers, { getState: () => mockState });

    expect(result.get('X-Market-Id')).toBe('ciudad-ojeda');
    expect(result.has('Authorization')).toBe(false);
  });

  it('injects both Authorization and X-Market-Id when both are present', () => {
    const headers = new Headers();
    const mockState = {
      session: { accessToken: 'token-123' },
      market: { activeMarketId: 'ciudad-ojeda' },
    } as unknown as RootState;

    const result = prepareApiHeaders(headers, { getState: () => mockState });

    expect(result.get('Authorization')).toBe('Bearer token-123');
    expect(result.get('X-Market-Id')).toBe('ciudad-ojeda');
  });

  it('omits headers when state has neither accessToken nor activeMarketId', () => {
    const headers = new Headers();
    const mockState = {
      session: { accessToken: null },
      market: { activeMarketId: null },
    } as unknown as RootState;

    const result = prepareApiHeaders(headers, { getState: () => mockState });

    expect(result.has('Authorization')).toBe(false);
    expect(result.has('X-Market-Id')).toBe(false);
  });
});
