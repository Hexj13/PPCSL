import { describe, expect, it } from '@jest/globals';

import { parsePdpHtml } from './pdp-parser';

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
});
