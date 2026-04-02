import { BodyType } from '../../../../common/types';
import { mapBodyType } from './body-type-mapper';

describe('body-type-mapper', () => {
  it('maps Universal to Wagon without warning', () => {
    expect(mapBodyType('Universal')).toEqual({ value: BodyType.Wagon });
  });

  it('maps Romanian universală form to Wagon', () => {
    expect(mapBodyType('Universală')).toEqual({ value: BodyType.Wagon });
  });

  it('maps Crossover to SUV without UNMAPPED_BODY warning', () => {
    expect(mapBodyType('Crossover')).toEqual({ value: BodyType.SUV });
  });

  it('maps Liftback to Hatchback', () => {
    expect(mapBodyType('Liftback')).toEqual({ value: BodyType.Hatchback });
  });

  it('maps Furgon to Minivan for car imports', () => {
    expect(mapBodyType('Furgon', 'car')).toEqual({ value: BodyType.Minivan });
  });

  it('maps Minivan to Minivan not Van (substring van must not win)', () => {
    expect(mapBodyType('Minivan')).toEqual({ value: BodyType.Minivan });
  });

  it('maps Microvan to Minivan', () => {
    expect(mapBodyType('Microvan')).toEqual({ value: BodyType.Minivan });
  });

  it('maps Microautobus to Bus for truck imports', () => {
    expect(mapBodyType('Microautobus', 'truck')).toEqual({ value: BodyType.Bus });
  });

  it('maps Autotractor to Tractor for truck imports', () => {
    expect(mapBodyType('Autotractor', 'truck')).toEqual({ value: BodyType.Tractor });
  });

  it('maps Platformă to SpecialEquipment for truck imports', () => {
    expect(mapBodyType('Platformă', 'truck')).toEqual({
      value: BodyType.SpecialEquipment,
    });
  });

  it('maps Touring to Touring for moto imports', () => {
    expect(mapBodyType('Touring', 'moto')).toEqual({ value: BodyType.Touring });
  });

  it('maps Sport touring to SportTouring for moto imports', () => {
    expect(mapBodyType('Sport touring', 'moto')).toEqual({
      value: BodyType.SportTouring,
    });
  });

  it('maps Scuter electric to ElectricScooter for moto imports', () => {
    expect(mapBodyType('Scuter electric', 'moto')).toEqual({
      value: BodyType.ElectricScooter,
    });
  });

  it('returns warning for unknown body and falls back to SUV', () => {
    expect(mapBodyType('UnknownCoachwork')).toEqual({
      value: BodyType.SUV,
      warning: 'UNMAPPED_BODY:UnknownCoachwork',
    });
  });

  it('returns truck-specific fallback for unknown truck body', () => {
    expect(mapBodyType('UnknownTruckBody', 'truck')).toEqual({
      value: BodyType.SpecialEquipment,
      warning: 'UNMAPPED_BODY:UnknownTruckBody',
    });
  });
});
