import { resolveActiveListingLimit } from '../../../common/constants';

import { collectMarkParsedTargets } from './partner-parsed-listings';

describe('partner-parsed-listings helpers', () => {
  describe('collectMarkParsedTargets', () => {
    it('collects listing ids and source keys from registry and PLP', () => {
      const targets = collectMarkParsedTargets(
        [
          { sourceListingId: '111', kupitoListingId: 'aaa' },
          { sourceListingId: '222', kupitoListingId: ' ' },
          { sourceListingId: null, kupitoListingId: 'bbb' },
        ],
        ['222', '333', ''],
      );

      expect(targets.listingIds.sort()).toEqual(['aaa', 'bbb']);
      expect(targets.externalKeys.sort()).toEqual(['111', '222', '333']);
    });
  });

  describe('resolveActiveListingLimit', () => {
    it('returns business and individual limits', () => {
      expect(resolveActiveListingLimit('Business')).toBe(1000);
      expect(resolveActiveListingLimit('Individual')).toBe(100);
      expect(resolveActiveListingLimit(undefined)).toBe(100);
    });
  });
});
