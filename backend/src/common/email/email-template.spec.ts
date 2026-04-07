import {
  buildEmailLayout,
  emailCtaButton,
  escapeHtml,
  normalizeSiteBaseUrl,
} from './email-template';

describe('email-template', () => {
  describe('emailCtaButton', () => {
    it('forces light CTA label color for link-styling email clients', () => {
      const html = emailCtaButton('https://example.com/go', 'Continue');
      expect(html).toContain('color:#ffffff !important');
      expect(html).toContain('<font color="#ffffff"');
      expect(html).toContain('class="kupito-email-cta"');
      expect(html).toContain('mso-text-underline:none');
    });
  });

  describe('buildEmailLayout', () => {
    it('includes CTA underline reset rules in head', () => {
      const html = buildEmailLayout({
        siteBaseUrl: 'https://kupito.club',
        documentTitle: 'T',
        heading: 'H',
        bodyHtml: '',
        supportEmail: 'support@kupito.club',
      });
      expect(html).toContain('a.kupito-email-cta');
      expect(html).toContain('text-decoration:none!important');
      expect(html).toContain('fonts.googleapis.com/css2?family=Inter');
      expect(html).toContain('"Inter",system-ui');
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
