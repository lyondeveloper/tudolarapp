import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

/**
 * `restoring` is the launch state: the stored refresh token has not been
 * exchanged yet, so the shell must not decide which screen to show. It resolves
 * to `anonymous` or `authenticated` once the restore attempt finishes.
 */
export type SessionStatus = 'restoring' | 'anonymous' | 'authenticated';

export interface SessionState {
  accessToken: string | null;
  userId: string | null;
  status: SessionStatus;
}

const initialState: SessionState = {
  accessToken: null,
  userId: null,
  status: 'restoring',
};

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    sessionRestoreStarted(state) {
      state.accessToken = null;
      state.userId = null;
      state.status = 'restoring';
    },
    sessionEstablished(
      state,
      action: PayloadAction<{ accessToken: string; userId?: string | null }>,
    ) {
      state.accessToken = action.payload.accessToken;
      state.userId = action.payload.userId ?? null;
      state.status = 'authenticated';
    },
    sessionCleared(state) {
      state.accessToken = null;
      state.userId = null;
      state.status = 'anonymous';
    },
  },
});

export const { sessionRestoreStarted, sessionEstablished, sessionCleared } =
  sessionSlice.actions;
export const sessionReducer = sessionSlice.reducer;
