import {
  buildEmailLayout,
  emailCtaButton,
  escapeHtml,
  normalizeSiteBaseUrl,
} from './email-template';

describe('email-template', () => {
  describe('emailCtaButton', () => {
    it('returns MJML button block with label and href', () => {
      const mjml = emailCtaButton('https://example.com/go', 'Continue');
      expect(mjml).toContain('<mj-button');
      expect(mjml).toContain('https://example.com/go');
      expect(mjml).toContain('Continue');
    });
  });

  describe('buildEmailLayout', () => {
    it('renders compiled html with brand footer and signature', () => {
      const html = buildEmailLayout({
        siteBaseUrl: 'https://example.test',
        documentTitle: 'T',
        heading: 'H',
        bodyHtml: '',
        supportEmail: 'support@example.test',
        signatureLine: 'Platform for posting car sale listings in Moldova',
      });
      expect(html).toContain('<!doctype html>');
      expect(html).toContain('Arial, Helvetica, sans-serif');
      expect(html).toContain('example.test');
      expect(html).toContain('alt="example.test"');
      expect(html).toContain('Platform for posting car sale listings in Moldova');
      expect(html).toContain('support@example.test');
      expect(html).toContain('/logo.png');
    });

    it('uses siteName, copyright and custom logo when provided', () => {
      const html = buildEmailLayout({
        siteBaseUrl: 'https://shop.example',
        siteName: 'Example Market',
        documentTitle: 'T',
        heading: 'H',
        bodyHtml: '',
        supportEmail: 'support@shop.example',
        copyrightLine: '© 2025-2026 shop.example. All rights reserved.',
        logoSrc: '/logo-email.png',
        logoWidthPx: 180,
      });
      expect(html).toContain('alt="Example Market"');
      expect(html).toContain('Example Market');
      expect(html).toContain('shop.example');
      expect(html).toContain('© 2025-2026 shop.example. All rights reserved.');
      expect(html).toContain('/logo-email.png');
      expect(html).toContain('width="180"');
    });
  });

  describe('escapeHtml', () => {
    it('escapes HTML special characters', () => {
      expect(escapeHtml(`<script>&"'</script>`)).toBe(
        '&lt;script&gt;&amp;&quot;&#39;&lt;/script&gt;',
      );
    });
  });

  describe('normalizeSiteBaseUrl', () => {
    it('trims trailing slashes', () => {
      expect(normalizeSiteBaseUrl('https://example.test/')).toBe('https://example.test');
      expect(normalizeSiteBaseUrl('https://example.test///')).toBe('https://example.test');
    });
  });
});
