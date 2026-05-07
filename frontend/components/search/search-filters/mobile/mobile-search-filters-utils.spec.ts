import {
  normalizeEngineDisplacementRangeOrder,
  normalizeHorsepowerRangeOrder,
  normalizeMileageRangeOrder,
  normalizePriceRangeOrder,
} from './mobile-search-filters-utils';

describe('normalizeHorsepowerRangeOrder', () => {
  it('swaps when from is greater than to', () => {
    expect(normalizeHorsepowerRangeOrder('300', '100')).toEqual({
      horsepowerGte: '100',
      horsepowerLte: '300',
    });
  });

  it('keeps order when from is less than or equal to to', () => {
    expect(normalizeHorsepowerRangeOrder('100', '250')).toEqual({
      horsepowerGte: '100',
      horsepowerLte: '250',
    });
  });
});

describe('normalizeEngineDisplacementRangeOrder', () => {
  it('swaps when from is greater than to', () => {
    expect(normalizeEngineDisplacementRangeOrder('3.0', '1.4')).toEqual({
      engineGte: '1.4',
      engineLte: '3.0',
    });
  });

  it('accepts comma as decimal separator for comparison', () => {
    expect(normalizeEngineDisplacementRangeOrder('2,5', '1,0')).toEqual({
      engineGte: '1,0',
      engineLte: '2,5',
    });
  });

  it('does not swap when either bound is empty', () => {
    expect(normalizeEngineDisplacementRangeOrder('', '2.0')).toEqual({
      engineGte: '',
      engineLte: '2.0',
    });
  });
});

describe('normalizeMileageRangeOrder', () => {
  it('swaps values when from is greater than to', () => {
    expect(normalizeMileageRangeOrder('200000', '100000')).toEqual({
      mileageGte: '100000',
      mileageLte: '200000',
    });
  });

  it('keeps order when from is less than or equal to to', () => {
    expect(normalizeMileageRangeOrder('50000', '150000')).toEqual({
      mileageGte: '50000',
      mileageLte: '150000',
    });
    expect(normalizeMileageRangeOrder('100000', '100000')).toEqual({
      mileageGte: '100000',
      mileageLte: '100000',
    });
  });

  it('does not swap when either bound is empty', () => {
    expect(normalizeMileageRangeOrder('', '50000')).toEqual({
      mileageGte: '',
      mileageLte: '50000',
    });
    expect(normalizeMileageRangeOrder('50000', '')).toEqual({
      mileageGte: '50000',
      mileageLte: '',
    });
  });

  it('strips non-digits', () => {
    expect(normalizeMileageRangeOrder('10 000 km', '5 000')).toEqual({
      mileageGte: '5000',
      mileageLte: '10000',
    });
  });
});

describe('normalizePriceRangeOrder', () => {
  it('still swaps inverted numeric ranges', () => {
    expect(normalizePriceRangeOrder('9000', '1000')).toEqual({
      priceGte: '1000',
      priceLte: '9000',
    });
  });
});
