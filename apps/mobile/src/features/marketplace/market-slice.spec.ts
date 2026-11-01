import {
  marketReducer,
  marketSelected,
  selectActiveMarketId,
  selectActiveMarketName,
} from './market-slice';

describe('market slice', () => {
  it('defaults to the Ciudad Ojeda pilot market', () => {
    const state = marketReducer(undefined, { type: '@@INIT' });

    expect(selectActiveMarketId({ market: state })).toBe('ciudad-ojeda');
    expect(selectActiveMarketName({ market: state })).toBe('Ciudad Ojeda');
  });

  it('updates the active market when marketSelected is dispatched', () => {
    const state = marketReducer(
      undefined,
      marketSelected({
        marketId: 'cabimas',
        marketName: 'Cabimas',
      }),
    );

    expect(selectActiveMarketId({ market: state })).toBe('cabimas');
    expect(selectActiveMarketName({ market: state })).toBe('Cabimas');
  });
});
