import {
  getEngineVolumeFilterOptions,
  getMileageFilterOptions,
  getPowerFilterOptions,
  getPriceFilterOptions,
  getTireDiameterFilterOptions,
  getTireProfileFilterOptions,
  getTireWidthFilterOptions,
} from './filter-range-options';

describe('getPriceFilterOptions', () => {
  it('includes agreed step boundaries', () => {
    const values = getPriceFilterOptions().map((o) => o.value);
    expect(values).toContain('100');
    expect(values).toContain('1000');
    expect(values).toContain('1500');
    expect(values).toContain('10000');
    expect(values).toContain('11000');
    expect(values).toContain('50000');
    expect(values).toContain('55000');
    expect(values).toContain('100000');
    expect(values).toContain('110000');
    expect(values).toContain('200000');
  });

  it('formats labels with thousand separators', () => {
    const option = getPriceFilterOptions().find((o) => o.value === '10000');
    expect(option?.label).toBe('10 000');
  });
});

describe('getMileageFilterOptions', () => {
  it('includes zero and upper mileage steps', () => {
    const values = getMileageFilterOptions().map((o) => o.value);
    expect(values[0]).toBe('0');
    expect(values).toContain('5000');
    expect(values).toContain('150000');
    expect(values).toContain('160000');
    expect(values).toContain('300000');
    expect(values).toContain('325000');
    expect(values).toContain('500000');
  });
});

describe('getPowerFilterOptions', () => {
  it('includes agreed power steps', () => {
    const values = getPowerFilterOptions().map((o) => o.value);
    expect(values).toContain('20');
    expect(values).toContain('300');
    expect(values).toContain('325');
    expect(values).toContain('500');
    expect(values).toContain('550');
    expect(values).toContain('1000');
  });
});

describe('getEngineVolumeFilterOptions', () => {
  it('includes car/truck volume up to 20 liters', () => {
    const values = getEngineVolumeFilterOptions('car').map((o) => o.value);
    expect(values).toContain('0.1');
    expect(values).toContain('2');
    expect(values).toContain('2.5');
    expect(values).toContain('5');
    expect(values).toContain('6');
    expect(values).toContain('20');
  });

  it('limits moto volume to 5 liters', () => {
    const values = getEngineVolumeFilterOptions('moto').map((o) => o.value);
    expect(values).toContain('0.1');
    expect(values).toContain('5');
    expect(values).not.toContain('6');
    expect(values).not.toContain('20');
  });
});

describe('getTireWidthFilterOptions', () => {
  it('starts at 125 and ends at 355 with step 10', () => {
    const values = getTireWidthFilterOptions().map((o) => Number(o.value));
    expect(values[0]).toBe(125);
    expect(values[values.length - 1]).toBe(355);
    expect(values).toContain(205);
    expect(values).not.toContain(130);
  });
});

describe('getTireProfileFilterOptions', () => {
  it('covers profile range with step 5', () => {
    const values = getTireProfileFilterOptions().map((o) => Number(o.value));
    expect(values[0]).toBe(5);
    expect(values[values.length - 1]).toBe(95);
    expect(values).toContain(55);
  });
});

describe('getTireDiameterFilterOptions', () => {
  it('covers diameter range with step 0.5', () => {
    const values = getTireDiameterFilterOptions().map((o) => o.value);
    expect(values[0]).toBe('10');
    expect(values).toContain('16');
    expect(values).toContain('16.5');
    expect(values[values.length - 1]).toBe('35');
  });
});
