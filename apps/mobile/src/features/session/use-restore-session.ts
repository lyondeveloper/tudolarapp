import { useEffect } from 'react';
import { useRefreshSessionMutation } from '@/services/api';
import { useAppDispatch } from '@/store/hooks';
import {
  clearRefreshToken,
  readRefreshToken,
  writeRefreshToken,
} from './secure-session-storage';
import {
  sessionCleared,
  sessionEstablished,
  sessionRestoreStarted,
} from './session-slice';

/**
 * Restores a session at launch by exchanging the stored refresh token. This is
 * a genuine synchronisation with an external system, which is what Effects are
 * for; the token rotation happens server-side.
 */
export function useRestoreSession(): void {
  const dispatch = useAppDispatch();
  const [refreshSession] = useRefreshSessionMutation();

  useEffect(() => {
    let cancelled = false;

    dispatch(sessionRestoreStarted());

    const restore = async () => {
      const refreshToken = await readRefreshToken();
      if (cancelled) return;
      if (!refreshToken) {
        dispatch(sessionCleared());
        return;
      }

      try {
        const tokens = await refreshSession({ refreshToken }).unwrap();
        if (cancelled) return;
        await writeRefreshToken(tokens.refreshToken);
        dispatch(sessionEstablished({ accessToken: tokens.accessToken }));
      } catch {
        if (cancelled) return;
        await clearRefreshToken();
        dispatch(sessionCleared());
      }
    };

    void restore();

    return () => {
      cancelled = true;
    };
  }, [dispatch, refreshSession]);
}
