import { ConfigService } from '@nestjs/config';

import { InfocarReportUrlProvider } from './infocar-report-url.provider';

function createProvider(env: Record<string, string | undefined>): InfocarReportUrlProvider {
  const configService = {
    get: (key: string) => env[key],
  } as unknown as ConfigService;
  return new InfocarReportUrlProvider(configService);
}

describe('InfocarReportUrlProvider', () => {
  describe('Infocar (encrypted VIN)', () => {
    const env = {
      INFOCAR_SECRET_KEY: 'partner-secret',
      INFOCAR_PARTNER_FROM: 'kupito',
      INFOCAR_BASE_URL: 'https://infocar.md',
      INFOCAR_BASE_URL_RU: 'https://ru.infocar.md',
    };

    it('is enabled when secret and partner are set', () => {
      expect(createProvider(env).isEnabled()).toBe(true);
    });

    it('encrypts VIN and appends from= partner param', async () => {
      const url = await createProvider(env).generateUrl('WBA21FL020CV09474', 'ro');
      expect(url.startsWith('https://infocar.md?from=kupito&vin=')).toBe(true);
      const vin = new URL(url).searchParams.get('vin') ?? '';
      expect(vin).not.toBe('WBA21FL020CV09474');
      expect(vin.length).toBeGreaterThan(16);
    });

    it('uses the RU host for ru locale', async () => {
      const url = await createProvider(env).generateUrl('WBA21FL020CV09474', 'ru');
      expect(url.startsWith('https://ru.infocar.md?from=kupito&vin=')).toBe(true);
    });
  });

  describe('CarVertical (plain VIN, no affiliate)', () => {
    const env = {
      REPORT_PROVIDER_BASE_URL: 'https://www.carvertical.com/en',
      REPORT_PROVIDER_BASE_URL_RU: 'https://www.carvertical.com/en',
    };

    it('is enabled without a secret or affiliate id when explicit base URLs are set', () => {
      expect(createProvider(env).isEnabled()).toBe(true);
    });

    it('is disabled when base URLs are missing', () => {
      expect(createProvider({}).isEnabled()).toBe(false);
    });

    it('appends plaintext VIN without an affiliate param', async () => {
      const url = await createProvider(env).generateUrl('WBA21FL020CV09474', 'ro');
      expect(url).toBe('https://www.carvertical.com/en?vin=WBA21FL020CV09474');
    });

    it('returns a fallback URL without VIN', () => {
      expect(createProvider(env).getFallbackUrl('ro')).toBe('https://www.carvertical.com/en');
    });

    it('appends a= when an affiliate id is configured later', async () => {
      const url = await createProvider({
        ...env,
        REPORT_PROVIDER_PARTNER_FROM: 'partner-id',
        REPORT_PROVIDER_PARTNER_PARAM: 'a',
      }).generateUrl('ABC123', 'ro');
      expect(url).toBe('https://www.carvertical.com/en?a=partner-id&vin=ABC123');
    });
  });
});
