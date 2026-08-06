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
        siteBaseUrl: 'https://kupito.club',
        documentTitle: 'T',
        heading: 'H',
        bodyHtml: '',
        supportEmail: 'support@kupito.club',
        signatureLine: 'Platform for posting car sale listings in Moldova',
      });
      expect(html).toContain('<!doctype html>');
      expect(html).toContain('Arial, Helvetica, sans-serif');
      expect(html).toContain('kupito.club');
      expect(html).toContain('alt="kupito.club"');
      expect(html).toContain('Platform for posting car sale listings in Moldova');
      expect(html).toContain('support@kupito.club');
    });

    it('uses siteName when provided', () => {
      const html = buildEmailLayout({
        siteBaseUrl: 'https://makinaguru.com',
        siteName: 'MakinaGuru',
        documentTitle: 'T',
        heading: 'H',
        bodyHtml: '',
        supportEmail: 'support@makinaguru.com',
      });
      expect(html).toContain('alt="MakinaGuru"');
      expect(html).toContain('MakinaGuru');
      expect(html).toContain('makinaguru.com');
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
      expect(normalizeSiteBaseUrl('https://kupito.club/')).toBe('https://kupito.club');
      expect(normalizeSiteBaseUrl('https://kupito.club///')).toBe('https://kupito.club');
    });
  });
});
