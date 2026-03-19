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

  it('returns warning for unknown body and falls back to SUV', () => {
    expect(mapBodyType('UnknownCoachwork')).toEqual({
      value: BodyType.SUV,
      warning: 'UNMAPPED_BODY:UnknownCoachwork',
    });
  });
});
