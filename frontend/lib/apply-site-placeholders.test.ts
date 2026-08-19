import { applySitePlaceholders } from './apply-site-placeholders';

describe('applySitePlaceholders', () => {
  const site = {
    supportEmail: 'support@example.com',
    siteUrl: 'https://example.com',
    domain: 'example.com',
  };

  it('replaces email, site URL, and domain tokens', () => {
    expect(
      applySitePlaceholders('Write to {supportEmail} or visit {siteUrl} ({domain})', site),
    ).toBe('Write to support@example.com or visit https://example.com (example.com)');
  });
});
