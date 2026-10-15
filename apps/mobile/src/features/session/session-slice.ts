import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface SessionState {
  accessToken: string | null;
  userId: string | null;
}

const initialState: SessionState = {
  accessToken: null,
  userId: null,
};

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    sessionEstablished(
      state,
      action: PayloadAction<{ accessToken: string; userId?: string | null }>,
    ) {
      state.accessToken = action.payload.accessToken;
      state.userId = action.payload.userId ?? null;
    },
    sessionCleared(state) {
      state.accessToken = null;
      state.userId = null;
    },
  },
});

export const { sessionEstablished, sessionCleared } = sessionSlice.actions;
export const sessionReducer = sessionSlice.reducer;
