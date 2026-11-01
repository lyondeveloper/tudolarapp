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

export interface PhoneVerificationRequest {
  phoneE164: string;
}

export interface VerifyPhoneRequest {
  phoneE164: string;
  code: string;
}

export type SellerEligibilityState =
  | 'none'
  | 'contact_verified'
  | 'eligible'
  | 'suspended'
  | 'rejected';

export interface SellerEligibilityResponse {
  sellerId: string;
  state: SellerEligibilityState;
}

export interface PublishOfferRequest {
  pairId: string;
  initialAmount: string;
  giveAmount: string;
  receiveAmount: string;
  minAmount: string;
  maxAmount: string;
  rate?: string | null;
  marginPct: string;
  description: string;
  details?: string | null;
  location: {
    latitude: number;
    longitude: number;
  };
  expiresAt?: string;
}

export interface PublishOfferResponse {
  id: string;
  pairId: string;
  currentTermsVersionId: string;
  status: string;
  description: string;
  details: string | null;
  location: {
    latitude: number;
    longitude: number;
  };
  terms: {
    version: number;
    giveAmount: string;
    receiveAmount: string;
    rate: string | null;
    marginPct: string;
    minAmount: string;
    maxAmount: string;
    expiresAt: string;
  };
}

export interface SearchOffersQueryArgs {
  pairId?: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  amount?: string;
  cursor?: string;
  limit?: number;
}

export interface SearchOfferItemDto {
  id: string;
  pairId: string;
  distanceMeters: number | null;
  status: string;
  description: string;
  details: string | null;
  location: {
    latitude: number;
    longitude: number;
  };
  currentTermsVersionId: string;
  terms: {
    version: number;
    giveAmount: string;
    receiveAmount: string;
    rate: string | null;
    marginPct: string;
    minAmount: string;
    maxAmount: string;
    expiresAt: string;
  };
}

export interface SearchOffersResponse {
  items: SearchOfferItemDto[];
  nextCursor: string | null;
}

export interface MessageResponse {
  message: string;
}

export interface HealthResponse {
  status: string;
}

/** The API's URI version. The client never hard-codes it per endpoint. */
const API_VERSION_PREFIX = '/v1';

/** The versioned API root: the configured host plus the version prefix. */
function apiBaseUrl(): string {
  return `${resolveApiBaseUrl().replace(/\/+$/, '')}${API_VERSION_PREFIX}`;
}

/**
 * Prepares HTTP headers for RTK Query requests.
 * Attaches Authorization Bearer token when authenticated,
 * and X-Market-Id when a market is actively selected.
 */
export function prepareApiHeaders(
  headers: Headers,
  { getState }: { getState: () => unknown }
): Headers {
  const state = getState() as RootState;
  const accessToken = state.session?.accessToken;
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }
  const activeMarketId = state.market?.activeMarketId;
  if (activeMarketId) {
    headers.set('X-Market-Id', activeMarketId);
  }
  return headers;
}

/**
 * One `createApi` slice for the whole API. RTK Query is the only server-state
 * cache in this app; do not add a second one.
 */
export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: apiBaseUrl(),
    prepareHeaders: prepareApiHeaders,
  }),
  tagTypes: ['CurrentUser', 'SellerEligibility', 'Offers'],
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
    requestPhoneVerification: builder.mutation<
      MessageResponse,
      PhoneVerificationRequest
    >({
      query: (body) => ({
        url: '/users/me/phone-verification/challenges',
        method: 'POST',
        body,
      }),
    }),
    verifyPhone: builder.mutation<MessageResponse, VerifyPhoneRequest>({
      query: (body) => ({
        url: '/users/me/phone-verification/verify',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['CurrentUser'],
    }),
    sellerEligibility: builder.query<SellerEligibilityResponse, void>({
      query: () => '/sellers/me/eligibility',
      providesTags: ['SellerEligibility'],
    }),
    onboardSeller: builder.mutation<SellerEligibilityResponse, void>({
      query: () => ({ url: '/sellers/onboard', method: 'POST' }),
      invalidatesTags: ['SellerEligibility'],
    }),
    publishOffer: builder.mutation<PublishOfferResponse, PublishOfferRequest>({
      query: (body) => ({
        url: '/offers',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Offers'],
    }),
    searchOffers: builder.query<SearchOffersResponse, SearchOffersQueryArgs | void>({
      query: (params) => ({
        url: '/search/offers',
        params: params || undefined,
      }),
      providesTags: ['Offers'],
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
  useRequestPhoneVerificationMutation,
  useVerifyPhoneMutation,
  useSellerEligibilityQuery,
  useOnboardSellerMutation,
  usePublishOfferMutation,
  useSearchOffersQuery,
} = api;
