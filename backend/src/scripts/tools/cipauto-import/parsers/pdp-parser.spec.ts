import { describe, expect, it } from '@jest/globals';

import { BodyType, FuelType } from '../../../../common/types';
import { mapBodyType } from '../../partner-import-shared/mapping/body-type-mapper';
import { mapFuel } from '../../partner-import-shared/mapping/enum-mapper';
import { buildCipautoBilingualPdpUrls, parsePdpHtml } from './pdp-parser';

describe('buildCipautoBilingualPdpUrls', () => {
  it('builds ro and ru PDP URLs from a plain vehicul path', () => {
    const { roUrl, ruUrl } = buildCipautoBilingualPdpUrls(
      'https://cipauto.md/vehicul/850827-volvo-xc90/',
    );
    expect(roUrl).toBe('https://cipauto.md/vehicul/850827-volvo-xc90/');
    expect(ruUrl).toBe('https://cipauto.md/ru/vehicul/850827-volvo-xc90/');
  });

  it('builds ro and ru PDP URLs when the source URL already has a locale prefix', () => {
    const { roUrl, ruUrl } = buildCipautoBilingualPdpUrls(
      'https://cipauto.md/ru/vehicul/850827-volvo-xc90/',
    );
    expect(roUrl).toBe('https://cipauto.md/vehicul/850827-volvo-xc90/');
    expect(ruUrl).toBe('https://cipauto.md/ru/vehicul/850827-volvo-xc90/');
  });
});

describe('parsePdpHtml', () => {
  it('marks active listing pages as active source status', () => {
    const parsed = parsePdpHtml(
      `
        <html>
          <head>
            <title>Volkswagen Golf 2020 - 12.990€ | CipAuto.md</title>
            <script type="application/ld+json">
              {
                "@type": "Product",
                "name": "Volkswagen Golf 2020",
                "model": "Golf",
                "modelDate": 2020,
                "brand": { "name": "Volkswagen" },
                "offers": { "price": "12990", "priceCurrency": "EUR" }
              }
            </script>
          </head>
          <body>
            <h1 class="cipauto-vehicle-title">Volkswagen Golf 2020</h1>
            <div id="gallery-data">{"images":["https://img/1.jpg","https://img/2.jpg"]}</div>
          </body>
        </html>
      `,
      'https://cipauto.md/vehicul/j12345-volkswagen-golf/',
    );

    expect(parsed.sourceListingId).toBe('j12345-volkswagen-golf');
    expect(parsed.sourceStatus).toBe('active');
    expect(parsed.sourceStatusReason).toBeUndefined();
  });

  it('marks sold templates as closed source status', () => {
    const parsed = parsePdpHtml(
      `
        <html>
          <head>
            <title>Dacia Logan 2021 - 8.990€ | CipAuto.md</title>
          </head>
          <body>
            <div>VÂNDUT!</div>
            <h1 class="cipauto-vehicle-title">Dacia Logan 2021</h1>
            <div>🤯 S-a vândut deja?!</div>
            <div>Nici o grijă</div>
          </body>
        </html>
      `,
      'https://cipauto.md/vehicul/j54321-dacia-logan/',
    );

    expect(parsed.sourceListingId).toBe('j54321-dacia-logan');
    expect(parsed.sourceStatus).toBe('closed');
    expect(parsed.sourceStatusReason).toBe('pdp_template');
    expect(parsed.warnings).toContain('SOURCE_CLOSED:pdp_template');
  });

  it('keeps active PDP pages active when description contains sold-related words', () => {
    const parsed = parsePdpHtml(
      `
        <html>
          <head>
            <title>Ford Kuga 2017 - 12.650€ | CipAuto.md</title>
          </head>
          <body>
            <h1 class="cipauto-vehicle-title">Ford Kuga</h1>
            <div class="cipauto-vehicle-price-block">
              <span class="current-price">12 650€</span>
            </div>
            <div id="gallery-data">{"images":["https://img/1.jpg","https://img/2.jpg"]}</div>
            <div class="cipauto-description-content">
              Știai că Ford Kuga PHEV a fost cel mai vândut vehicul hibrid cu încărcare la priză din Europa?
            </div>
            <section>
              Clientul n-a trebuit să-și facă nicio grijă.
            </section>
          </body>
        </html>
      `,
      'https://cipauto.md/vehicul/d89011-ford-kuga/',
    );

    expect(parsed.sourceListingId).toBe('d89011-ford-kuga');
    expect(parsed.sourceStatus).toBe('active');
    expect(parsed.sourceStatusReason).toBeUndefined();
    expect(parsed.warnings).not.toContain('SOURCE_CLOSED:pdp_template');
  });
});

describe('pdp-parser', () => {
  it('extracts equipment options (slug + label) from DOM attributes', () => {
    const url = 'https://cipauto.md/vehicul/12345-test/';
    const html = `
      <html>
        <body>
          <div class="cipauto-options-container">
            <div class="cipauto-spec-label" data-feature="360_monitoring">Sistem de monitorizare 360°</div>
          </div>
        </body>
      </html>
    `;

    const parsed = parsePdpHtml(html, url);
    expect(parsed.equipmentOptions).toEqual([
      { slug: '360_monitoring', label: 'Sistem de monitorizare 360°' },
    ]);
  });

  it('parses engine volume from spec labels without rounding', () => {
    const url = 'https://cipauto.md/vehicul/12345-test/';
    const html = `
      <html>
        <body>
          <div class="cipauto-spec">
            <span class="spec-label">1.2 L</span>
            <span class="spec-label">130 cp</span>
          </div>
        </body>
      </html>
    `;

    const parsed = parsePdpHtml(html, url);
    expect(parsed.engineVolumeL).toBeCloseTo(1.2, 3);
  });

  it('extracts horsepower from spec labels', () => {
    const url = 'https://cipauto.md/vehicul/12345-test/';
    const html = `
      <html>
        <body>
          <div class="cipauto-spec">
            <span class="spec-label">1.2 L</span>
            <span class="spec-label">130 cp</span>
          </div>
        </body>
      </html>
    `;

    const parsed = parsePdpHtml(html, url);
    expect(parsed.horsepowerFromPdp).toBe(130);
  });

  it('parses engine volume from JSON-LD engineDisplacement without rounding', () => {
    const url = 'https://cipauto.md/vehicul/12345-test/';
    const html = `
      <html>
        <head>
          <script type="application/ld+json">
            {
              "@type": "Car",
              "vehicleEngine": {
                "@type": "EngineSpecification",
                "engineDisplacement": {
                  "@type": "QuantitativeValue",
                  "value": "1.2",
                  "unitCode": "LTR"
                }
              }
            }
          </script>
        </head>
        <body>
        </body>
      </html>
    `;

    const parsed = parsePdpHtml(html, url);
    expect(parsed.engineVolumeL).toBeCloseTo(1.2, 3);
  });

  it('extracts drive type from labeled spec item (Tracțiune)', () => {
    const url = 'https://cipauto.md/vehicul/12345-test/';
    const html = `
      <html>
        <body>
          <div class="cipauto-spec-item">
            <div class="cipauto-spec-details">
              <div class="cipauto-spec-label">Tracțiune</div>
              <div class="cipauto-spec-value">Față</div>
            </div>
          </div>
        </body>
      </html>
    `;

    const parsed = parsePdpHtml(html, url);
    expect(parsed.driveTypeRaw).toBe('Față');
  });

  it('falls back drive type to old specs-first selector', () => {
    const url = 'https://cipauto.md/vehicul/12345-test/';
    const html = `
      <html>
        <body>
          <div class="cipauto-vehicle-specs-first">
            <div class="cipauto-spec">
              <span class="spec-label">Benzina</span>
              <span class="spec-label">Spate</span>
              <span class="spec-label">Automată</span>
            </div>
          </div>
        </body>
      </html>
    `;

    const parsed = parsePdpHtml(html, url);
    expect(parsed.driveTypeRaw).toBe('Spate');
  });

  it('reads fuel and body type from JSON-LD used on CipAuto cards', () => {
    const url = 'https://cipauto.md/vehicul/12345-test/';
    const html = `
      <html>
        <head>
          <script type="application/ld+json">
            {
              "@type": "Car",
              "fuelType": "Plug-in Hybrid",
              "bodyType": "Furgon"
            }
          </script>
        </head>
        <body></body>
      </html>
    `;

    const parsed = parsePdpHtml(html, url);

    expect(parsed.fuelRaw).toBe('Plug-in Hybrid');
    expect(parsed.bodyRaw).toBe('Furgon');
    expect(mapFuel(parsed.fuelRaw).value).toBe(FuelType.PHEV);
    expect(mapBodyType(parsed.bodyRaw, 'car').value).toBe(BodyType.Minivan);
  });

  it('falls back to Furgon from description text when JSON-LD body type is absent', () => {
    const url = 'https://cipauto.md/vehicul/12345-test/';
    const html = `
      <html>
        <body>
          <div class="cipauto-description-content">
            Caroserie Furgon, potrivit pentru livrări urbane.
          </div>
        </body>
      </html>
    `;

    const parsed = parsePdpHtml(html, url);

    expect(parsed.bodyRaw).toBe('Furgon');
    expect(mapBodyType(parsed.bodyRaw, 'car').value).toBe(BodyType.Minivan);
  });

  it('extracts video URL from og:video meta', () => {
    const parsed = parsePdpHtml(
      `
        <html>
          <head>
            <title>Test car | CipAuto.md</title>
            <meta property="og:video" content="https://cdn.example.com/listings/promo.mp4" />
            <script type="application/ld+json">
              {"@type":"Product","name":"Test","brand":{"name":"X"},"model":"Y","modelDate":2020,"offers":{"price":"1","priceCurrency":"EUR"}}
            </script>
          </head>
          <body>
            <h1 class="cipauto-vehicle-title">Test</h1>
            <div id="gallery-data">{"images":["https://img/1.jpg","https://img/2.jpg"]}</div>
          </body>
        </html>
      `,
      'https://cipauto.md/vehicul/j99999-test-car/',
    );
    expect(parsed.videoUrl).toBe('https://cdn.example.com/listings/promo.mp4');
  });
});
