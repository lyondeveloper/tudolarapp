import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { marketReducer } from '@/features/marketplace/market-slice';
import { sessionReducer } from '@/features/session/session-slice';
import { api } from '@/services/api';
import { connectivityHandler } from './connectivity';

export const store = configureStore({
  reducer: {
    [api.reducerPath]: api.reducer,
    session: sessionReducer,
    market: marketReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(api.middleware),
});

setupListeners(store.dispatch, connectivityHandler);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
