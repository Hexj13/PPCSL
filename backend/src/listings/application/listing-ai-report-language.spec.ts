import { resolveAiReportLanguage } from './listing-ai-report-language';

describe('resolveAiReportLanguage', () => {
  it('prefers x header', () => {
    expect(
      resolveAiReportLanguage({
        headerReportLanguage: 'ru',
        acceptLanguage: 'ro-RO',
        bodyLanguage: 'ro',
      }),
    ).toBe('ru');
  });

  it('uses Accept-Language ru', () => {
    expect(
      resolveAiReportLanguage({
        acceptLanguage: 'ru-RU,en;q=0.9',
        bodyLanguage: 'ro',
      }),
    ).toBe('ru');
  });

  it('falls back to body then ro', () => {
    expect(
      resolveAiReportLanguage({
        acceptLanguage: 'en-US',
        bodyLanguage: 'ro',
      }),
    ).toBe('ro');
    expect(resolveAiReportLanguage({})).toBe('ro');
  });
});
