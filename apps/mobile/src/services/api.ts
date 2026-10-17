import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { resolveApiBaseUrl } from '@/config/env';
import type { RootState } from '@/store';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/** Mirrors the API's private current-user DTO; it never carries secrets. */
export interface CurrentUser {
  id: string;
  displayName: string;
  username: string | null;
  email: string | null;
  emailVerified: boolean;
  phoneNumber: string | null;
  phoneVerified: boolean;
  accountStatus: string;
  authMethods: string[];
}

export interface SignInRequest {
  identifier: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  displayName: string;
  password: string;
}

export interface MessageResponse {
  message: string;
}

export interface HealthResponse {
  status: string;
}

/**
 * One `createApi` slice for the whole API. RTK Query is the only server-state
 * cache in this app; do not add a second one.
 */
export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: resolveApiBaseUrl(),
    prepareHeaders: (headers, { getState }) => {
      const { accessToken } = (getState() as RootState).session;
      if (accessToken) {
        headers.set('Authorization', `Bearer ${accessToken}`);
      }
      return headers;
    },
  }),
  tagTypes: ['CurrentUser'],
  endpoints: (builder) => ({
    health: builder.query<HealthResponse, void>({
      query: () => '/health',
    }),
    currentUser: builder.query<CurrentUser, void>({
      query: () => '/users/me',
      providesTags: ['CurrentUser'],
    }),
    signInWithPassword: builder.mutation<AuthTokens, SignInRequest>({
      query: (body) => ({ url: '/auth/password/login', method: 'POST', body }),
    }),
    registerWithPassword: builder.mutation<MessageResponse, RegisterRequest>({
      query: (body) => ({
        url: '/auth/password/register',
        method: 'POST',
        body,
      }),
    }),
    refreshSession: builder.mutation<AuthTokens, { refreshToken: string }>({
      query: (body) => ({
        url: '/auth/sessions/refresh',
        method: 'POST',
        body,
      }),
    }),
    logout: builder.mutation<void, void>({
      query: () => ({ url: '/auth/sessions/logout', method: 'POST' }),
      invalidatesTags: ['CurrentUser'],
    }),
  }),
});

export const {
  useHealthQuery,
  useCurrentUserQuery,
  useSignInWithPasswordMutation,
  useRegisterWithPasswordMutation,
  useRefreshSessionMutation,
  useLogoutMutation,
} = api;
