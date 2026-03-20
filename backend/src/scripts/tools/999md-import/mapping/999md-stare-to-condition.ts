import { ConditionType } from '../../../../common/constants';
import type { ConditionType as ConditionTypeT } from '../../../../common/types';

const STARE_OPTION_ID_TO_CONDITION: Record<number, ConditionTypeT> = {
  20665: ConditionType.Damaged,
  23242: ConditionType.Damaged,
  23739: ConditionType.Damaged,
  20666: ConditionType.ForParts,
  6372: ConditionType.ForParts,
  18668: ConditionType.Undamaged,
  23740: ConditionType.Undamaged,
  36141: ConditionType.Undamaged,
  23738: ConditionType.Undamaged,
  6370: ConditionType.Undamaged,
  18672: ConditionType.Undamaged,
  21187: ConditionType.Undamaged,
  26468: ConditionType.Undamaged,
  29865: ConditionType.Undamaged,
  26337: ConditionType.Undamaged,
  6371: ConditionType.Undamaged,
  21188: ConditionType.Undamaged,
  26074: ConditionType.Undamaged,
  27405: ConditionType.Undamaged,
  33736: ConditionType.Undamaged,
  27406: ConditionType.Undamaged,
};

export function map999mdStareOptionIdToCondition(optionId: number): ConditionTypeT | undefined {
  return STARE_OPTION_ID_TO_CONDITION[optionId];
}
