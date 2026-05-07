import type { SourceCloseReason } from '../../partner-import-shared/listing-types';

import type { AdvertRaw } from './advert-types';

const AD_STATE_PUBLIC = 'AD_STATE_PUBLIC';

const REASON_BY_PARSED: Record<string, SourceCloseReason> = {
  graphql_advert_null: 'graphql_advert_null',
  graphql_is_expired: 'graphql_is_expired',
  graphql_ad_state_removed: 'graphql_ad_state_removed',
  graphql_ad_state_blocked: 'graphql_ad_state_blocked',
  graphql_ad_state_need_pay: 'graphql_ad_state_need_pay',
  graphql_ad_state_hidden: 'graphql_ad_state_hidden',
  graphql_ad_state_draft: 'graphql_ad_state_draft',
  graphql_ad_state_pre_moderation: 'graphql_ad_state_pre_moderation',
  graphql_ad_state_unspecified: 'graphql_ad_state_unspecified',
};

export function evaluate999mdAdvertClosure(
  advert: AdvertRaw,
): { closed: true; reason: SourceCloseReason } | { closed: false } {
  const state = advert.state?.trim();
  if (state && state !== AD_STATE_PUBLIC) {
    const mapped = mapNonPublicAdState(state);
    if (mapped) {
      return { closed: true, reason: mapped };
    }
  }
  if (advert.isExpired === true) {
    return { closed: true, reason: 'graphql_is_expired' };
  }
  return { closed: false };
}

export function mapParsedReasonToSourceCloseReason(reason: string | undefined): SourceCloseReason {
  if (!reason) {
    return 'pdp_closed_template';
  }
  return REASON_BY_PARSED[reason] ?? 'pdp_closed_template';
}

function mapNonPublicAdState(state: string): SourceCloseReason | null {
  switch (state) {
    case 'AD_STATE_REMOVED':
      return 'graphql_ad_state_removed';
    case 'AD_STATE_BLOCKED':
      return 'graphql_ad_state_blocked';
    case 'AD_STATE_NEED_PAY':
      return 'graphql_ad_state_need_pay';
    case 'AD_STATE_HIDDEN':
      return 'graphql_ad_state_hidden';
    case 'AD_STATE_DRAFT':
      return 'graphql_ad_state_draft';
    case 'AD_STATE_PRE_MODERATION':
      return 'graphql_ad_state_pre_moderation';
    case 'AD_STATE_UNSPECIFIED':
      return null;
    default:
      return null;
  }
}
