import {
  getFilterRangesValidationError,
  getYearRange,
  PRICE_RANGE,
  clampToRange,
  isInRange,
  normalizeFilterRangeOrder,
  validateMinMax,
} from './validation-rules';

describe('validation-rules', () => {
  describe('getYearRange', () => {
    it('returns min 1940 and max current year', () => {
      const range = getYearRange();
      expect(range.min).toBe(1940);
      expect(range.max).toBe(new Date().getFullYear());
    });
  });

  describe('clampToRange', () => {
    it('clamps value to range', () => {
      expect(clampToRange(5, { min: 0, max: 10 })).toBe(5);
      expect(clampToRange(-1, { min: 0, max: 10 })).toBe(0);
      expect(clampToRange(15, { min: 0, max: 10 })).toBe(10);
    });
  });

  describe('isInRange', () => {
    it('returns true when value is within range', () => {
      expect(isInRange(5, { min: 0, max: 10 })).toBe(true);
      expect(isInRange(0, { min: 0, max: 10 })).toBe(true);
      expect(isInRange(10, { min: 0, max: 10 })).toBe(true);
    });
    it('returns false when value is outside range', () => {
      expect(isInRange(-1, { min: 0, max: 10 })).toBe(false);
      expect(isInRange(11, { min: 0, max: 10 })).toBe(false);
    });
  });

  describe('validateMinMax', () => {
    it('returns same when min <= max', () => {
      expect(validateMinMax(1, 10, PRICE_RANGE)).toEqual({ min: 1, max: 10 });
    });
    it('swaps when min > max', () => {
      expect(validateMinMax(10, 1, PRICE_RANGE)).toEqual({ min: 1, max: 10 });
    });
    it('returns nulls when both null', () => {
      expect(validateMinMax(null, null, PRICE_RANGE)).toEqual({ min: null, max: null });
    });
  });

  describe('getFilterRangesValidationError', () => {
    it('returns null when no filters or valid ranges', () => {
      expect(getFilterRangesValidationError({})).toBeNull();
      expect(getFilterRangesValidationError({ year_gte: '2020', year_lte: '2023' })).toBeNull();
    });

    it('returns year error key when year_gte > year_lte', () => {
      expect(getFilterRangesValidationError({ year_gte: '2023', year_lte: '2020' })).toBe(
        'searchFilters.yearFromGreaterThanTo',
      );
    });

    it('returns price error key when price_gte > price_lte', () => {
      expect(
        getFilterRangesValidationError({
          price_gte: '500000',
          price_lte: '100000',
        }),
      ).toBe('searchFilters.priceFromGreaterThanTo');
    });

    it('returns mileage error key when mileage_gte > mileage_lte', () => {
      expect(
        getFilterRangesValidationError({
          mileage_gte: '200000',
          mileage_lte: '100000',
        }),
      ).toBe('searchFilters.mileageFromGreaterThanTo');
    });

    it('returns engine error key when engine_displ_l_gte > engine_displ_l_lte', () => {
      expect(
        getFilterRangesValidationError({
          engine_displ_l_gte: '6.0',
          engine_displ_l_lte: '3.0',
        }),
      ).toBe('searchFilters.engineFromGreaterThanTo');
    });

    it('returns horsepower error key when horsepower_gte > horsepower_lte', () => {
      expect(
        getFilterRangesValidationError({
          horsepower_gte: '500',
          horsepower_lte: '300',
        }),
      ).toBe('searchFilters.horsepowerFromGreaterThanTo');
    });

    it('returns first error when multiple ranges invalid', () => {
      const filters = {
        year_gte: '2023',
        year_lte: '2020',
        price_gte: '500',
        price_lte: '100',
      };
      expect(getFilterRangesValidationError(filters)).toBe('searchFilters.yearFromGreaterThanTo');
    });
  });

  describe('normalizeFilterRangeOrder', () => {
    it('swaps inverted mileage, price, year, engine, and horsepower pairs', () => {
      expect(
        normalizeFilterRangeOrder({
          mileage_gte: '150000',
          mileage_lte: '50000',
        }),
      ).toEqual({
        mileage_gte: '50000',
        mileage_lte: '150000',
      });
      expect(
        normalizeFilterRangeOrder({
          price_gte: '8000',
          price_lte: '2000',
        }),
      ).toEqual({
        price_gte: '2000',
        price_lte: '8000',
      });
      expect(
        normalizeFilterRangeOrder({
          year_gte: '2024',
          year_lte: '2020',
        }),
      ).toEqual({
        year_gte: '2020',
        year_lte: '2024',
      });
      expect(
        normalizeFilterRangeOrder({
          engine_displ_l_gte: '3.0',
          engine_displ_l_lte: '1.6',
        }),
      ).toEqual({
        engine_displ_l_gte: '1.6',
        engine_displ_l_lte: '3.0',
      });
      expect(
        normalizeFilterRangeOrder({
          horsepower_gte: '300',
          horsepower_lte: '120',
        }),
      ).toEqual({
        horsepower_gte: '120',
        horsepower_lte: '300',
      });
    });

    it('parses spaced thousand separators so invert still swaps', () => {
      expect(
        normalizeFilterRangeOrder({
          mileage_gte: '150 000',
          mileage_lte: '50 000',
        }),
      ).toEqual({
        mileage_gte: '50000',
        mileage_lte: '150000',
      });
      expect(
        normalizeFilterRangeOrder({
          price_gte: '100 000',
          price_lte: '50 000',
        }),
      ).toEqual({
        price_gte: '50000',
        price_lte: '100000',
      });
    });

    it('does not swap when only one side is filled', () => {
      expect(
        normalizeFilterRangeOrder({
          mileage_gte: '150000',
          mileage_lte: '',
        }),
      ).toEqual({
        mileage_gte: '150000',
        mileage_lte: '',
      });
    });

    it('copies unrelated fields and leaves ordered ranges in place', () => {
      expect(
        normalizeFilterRangeOrder({
          fuels: ['Petrol'],
          mileage_gte: '50000',
          mileage_lte: '150000',
        }),
      ).toEqual({
        fuels: ['Petrol'],
        mileage_gte: '50000',
        mileage_lte: '150000',
      });
    });

    it('clears the range-order error after swap', () => {
      const ordered = normalizeFilterRangeOrder({
        mileage_gte: '150000',
        mileage_lte: '50000',
      });
      expect(getFilterRangesValidationError(ordered)).toBeNull();
    });
  });
});
