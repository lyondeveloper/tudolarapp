import {
  sessionCleared,
  sessionEstablished,
  sessionReducer,
  sessionRestoreStarted,
} from './session-slice';

/**
 * The slice is read through a local shape so the assertions fail on behaviour
 * rather than on a missing property, which keeps the red phase meaningful.
 */
function statusOf(state: unknown): unknown {
  return (state as { status?: unknown }).status;
}

describe('session slice status', () => {
  it('starts in the restoring status with no token', () => {
    const state = sessionReducer(undefined, { type: '@@INIT' });

    expect(statusOf(state)).toBe('restoring');
    expect((state as { accessToken: string | null }).accessToken).toBeNull();
  });

  it('becomes anonymous when the session is cleared before any token is restored', () => {
    const state = sessionReducer(undefined, sessionCleared());

    expect(statusOf(state)).toBe('anonymous');
  });

  it('becomes authenticated when a session is established', () => {
    const state = sessionReducer(
      undefined,
      sessionEstablished({ accessToken: 'access-token', userId: 'user-id' }),
    );

    expect(statusOf(state)).toBe('authenticated');
    expect((state as { accessToken: string | null }).accessToken).toBe(
      'access-token',
    );
    expect((state as { userId: string | null }).userId).toBe('user-id');
  });

  it('returns to anonymous when an authenticated session is cleared', () => {
    const authenticated = sessionReducer(
      undefined,
      sessionEstablished({ accessToken: 'access-token', userId: 'user-id' }),
    );
    const state = sessionReducer(authenticated, sessionCleared());

    expect(statusOf(state)).toBe('anonymous');
    expect((state as { accessToken: string | null }).accessToken).toBeNull();
    expect((state as { userId: string | null }).userId).toBeNull();
  });

  it('returns to restoring and drops any token when a restore starts', () => {
    const authenticated = sessionReducer(
      undefined,
      sessionEstablished({ accessToken: 'access-token', userId: 'user-id' }),
    );
    const state = sessionReducer(authenticated, sessionRestoreStarted());

    expect(statusOf(state)).toBe('restoring');
    expect((state as { accessToken: string | null }).accessToken).toBeNull();
    expect((state as { userId: string | null }).userId).toBeNull();
  });
});
