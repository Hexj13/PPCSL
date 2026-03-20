import { ConditionType } from '../../../../common/constants';

import { map999mdStareOptionIdToCondition } from './999md-stare-to-condition';

describe('map999mdStareOptionIdToCondition', () => {
  it('maps damaged-like Stare option ids to Damaged', () => {
    expect(map999mdStareOptionIdToCondition(20665)).toBe(ConditionType.Damaged);
    expect(map999mdStareOptionIdToCondition(23242)).toBe(ConditionType.Damaged);
    expect(map999mdStareOptionIdToCondition(23739)).toBe(ConditionType.Damaged);
  });

  it('maps dismantle / parts Stare option ids to ForParts', () => {
    expect(map999mdStareOptionIdToCondition(20666)).toBe(ConditionType.ForParts);
    expect(map999mdStareOptionIdToCondition(6372)).toBe(ConditionType.ForParts);
  });

  it('maps typical used / new Stare option ids to Undamaged', () => {
    expect(map999mdStareOptionIdToCondition(18668)).toBe(ConditionType.Undamaged);
    expect(map999mdStareOptionIdToCondition(6370)).toBe(ConditionType.Undamaged);
    expect(map999mdStareOptionIdToCondition(26337)).toBe(ConditionType.Undamaged);
  });

  it('returns undefined for unknown option id', () => {
    expect(map999mdStareOptionIdToCondition(999999999)).toBeUndefined();
  });
});
