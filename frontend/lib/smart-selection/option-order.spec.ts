import {
  orderBodyTypes,
  orderDrivingModes,
  orderFuels,
  orderPriorities,
  orderPurposes,
} from './option-order';

describe('smart-selection option-order', () => {
  it('orders common purposes first', () => {
    const ordered = orderPurposes();
    expect(ordered[0]).toBe('city');
    expect(ordered.indexOf('commute')).toBeLessThan(ordered.indexOf('active_offroad'));
  });

  it('orders city driving mode first for city purposes', () => {
    const ordered = orderDrivingModes(['city', 'commute']);
    expect(ordered[0]).toBe('city');
  });

  it('puts auto_pick last in body types', () => {
    const ordered = orderBodyTypes(['family'], '');
    expect(ordered[ordered.length - 1]).toBe('auto_pick');
    expect(ordered.indexOf('SUV')).toBeLessThan(ordered.indexOf('Coupe'));
  });

  it('orders petrol before electric for city commute', () => {
    const ordered = orderFuels({
      purposes: ['city'],
      drivingMode: 'city',
      size: '',
      bodyTypes: [],
      transmission: '',
      fuels: [],
      priorities: [],
    });
    expect(ordered.indexOf('Petrol')).toBeLessThan(ordered.indexOf('Electric'));
    expect(ordered[ordered.length - 1]).toBe('auto_pick');
  });

  it('boosts safety for family priorities list', () => {
    const ordered = orderPriorities(['family'], 'mixed');
    expect(ordered.indexOf('safety')).toBeLessThan(ordered.indexOf('looks'));
  });
});
