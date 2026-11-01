import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface MarketState {
  readonly activeMarketId: string;
  readonly activeMarketName: string;
}

const initialState: MarketState = {
  activeMarketId: 'ciudad-ojeda',
  activeMarketName: 'Ciudad Ojeda',
};

export const marketSlice = createSlice({
  name: 'market',
  initialState,
  reducers: {
    marketSelected(
      state,
      action: PayloadAction<{ marketId: string; marketName: string }>,
    ) {
      state.activeMarketId = action.payload.marketId;
      state.activeMarketName = action.payload.marketName;
    },
  },
});

export const { marketSelected } = marketSlice.actions;
export const marketReducer = marketSlice.reducer;

export const selectActiveMarketId = (state: { market: MarketState }): string =>
  state.market.activeMarketId;

export const selectActiveMarketName = (state: { market: MarketState }): string =>
  state.market.activeMarketName;
