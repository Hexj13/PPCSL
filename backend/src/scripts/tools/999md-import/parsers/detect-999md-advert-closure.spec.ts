import { describe, expect, it } from '@jest/globals';

import type { AdvertRaw } from './advert-types';
import {
  evaluate999mdAdvertClosure,
  mapParsedReasonToSourceCloseReason,
} from './detect-999md-advert-closure';

function advert(partial: Partial<AdvertRaw> & Pick<AdvertRaw, 'id' | 'title'>): AdvertRaw {
  return {
    ...partial,
  };
}

describe('evaluate999mdAdvertClosure', () => {
  it('returns closed for expired public advert', () => {
    const out = evaluate999mdAdvertClosure(
      advert({
        id: '100060412',
        title: 'X',
        state: 'AD_STATE_PUBLIC',
        isExpired: true,
      }),
    );
    expect(out).toEqual({ closed: true, reason: 'graphql_is_expired' });
  });

  it('returns closed for non-public state before isExpired', () => {
    const out = evaluate999mdAdvertClosure(
      advert({
        id: '1',
        title: 'Y',
        state: 'AD_STATE_REMOVED',
        isExpired: false,
      }),
    );
    expect(out).toEqual({ closed: true, reason: 'graphql_ad_state_removed' });
  });

  it('returns active for public non-expired advert', () => {
    const out = evaluate999mdAdvertClosure(
      advert({
        id: '2',
        title: 'Z',
        state: 'AD_STATE_PUBLIC',
        isExpired: false,
      }),
    );
    expect(out).toEqual({ closed: false });
  });

  it('returns active when state unspecified and not expired', () => {
    const out = evaluate999mdAdvertClosure(
      advert({
        id: '3',
        title: 'W',
        state: 'AD_STATE_UNSPECIFIED',
        isExpired: false,
      }),
    );
    expect(out).toEqual({ closed: false });
  });
});

describe('mapParsedReasonToSourceCloseReason', () => {
  it('maps graphql_is_expired', () => {
    expect(mapParsedReasonToSourceCloseReason('graphql_is_expired')).toBe('graphql_is_expired');
  });

  it('falls back for unknown reason string', () => {
    expect(mapParsedReasonToSourceCloseReason('unknown_xyz')).toBe('pdp_closed_template');
  });

  it('falls back when undefined', () => {
    expect(mapParsedReasonToSourceCloseReason(undefined)).toBe('pdp_closed_template');
  });
});
