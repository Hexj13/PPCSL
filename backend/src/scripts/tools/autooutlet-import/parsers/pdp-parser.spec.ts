import * as fs from 'node:fs';
import * as path from 'node:path';

import { Currency } from '../../../../common/types';
import { parsePdpHtml } from './pdp-parser';

const SUPABASE_IMG_A =
  'https://supabase-staging.autooutlet.md/storage/v1/object/public/vehicle-images/new-1/gallery/a.jpg';
const SUPABASE_IMG_B =
  'https://supabase-staging.autooutlet.md/storage/v1/object/public/vehicle-images/new-1/gallery/b.jpg';
const SUPABASE_IMG_C =
  'https://supabase-staging.autooutlet.md/storage/v1/object/public/vehicle-images/new-1/gallery/c.jpg';

function buildNextActiveFixture(): string {
  const encodedA = encodeURIComponent(SUPABASE_IMG_A);
  const encodedB = encodeURIComponent(SUPABASE_IMG_B);
  return `<!DOCTYPE html><html><body>
    <script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org/',
      '@type': 'Car',
      name: 'BYD Tang L 2025',
      brand: { '@type': 'Brand', name: 'BYD' },
      model: 'Tang L',
      vehicleModelDate: '2025',
      mileageFromOdometer: { '@type': 'QuantitativeValue', value: 14000, unitCode: 'KMT' },
      fuelType: 'Plug-in Hybrid',
      vehicleTransmission: 'Automatic',
      driveWheelConfiguration: '4WD',
      bodyType: 'Crossover',
      color: 'Verde închis',
      sku: '205910',
      image: [SUPABASE_IMG_A, SUPABASE_IMG_B, SUPABASE_IMG_C],
      offers: {
        '@type': 'Offer',
        priceCurrency: 'EUR',
        price: 35490,
        availability: 'https://schema.org/InStock',
      },
    })}</script>
    <main class="autooutlet-single-vehicle">
      <h1>BYD Tang L (4x4) 2025</h1>
      <div class="autooutlet-price">
        <span class="price-main">35.490€</span>
        <div class="price-details">
          <span class="price-monthly">587€/lună</span>
          <span class="price-advance">Avans 7.098€</span>
        </div>
      </div>
      <div class="autooutlet-header-badges">
        <span class="badge badge-dark">DISPONIBIL</span>
        <span class="badge badge-yellow">Cu rulaj</span>
      </div>
      <div class="autooutlet-leasing-block">
        <input type="number" class="autooutlet-input-field" value="7098" />
        <input type="number" class="autooutlet-input-field" value="587" readonly />
        <input type="number" class="autooutlet-input-field" value="60" />
      </div>
      <div class="vehicle-gallery-simple">
        <button class="autooutlet-gallery-main">
          <img src="/_next/image/?url=${encodedA}&amp;w=1200&amp;q=75" />
        </button>
        <div class="autooutlet-gallery-thumbnails-grid">
          <button class="autooutlet-gallery-thumb">
            <img src="/_next/image/?url=${encodedB}&amp;w=256&amp;q=75" />
          </button>
        </div>
      </div>
      <div class="autooutlet-specifications">
        <div class="spec-item"><span class="spec-label">Anul producerii</span><span class="spec-value">2025</span></div>
        <div class="spec-item"><span class="spec-label">Rulaj</span><span class="spec-value">14.000 km</span></div>
        <div class="spec-item"><span class="spec-label">Motorizare</span><span class="spec-value">Plug-in Hybrid</span></div>
        <div class="spec-item"><span class="spec-label">Capacitate cilindrică</span><span class="spec-value">1.5 L</span></div>
        <div class="spec-item"><span class="spec-label">Putere maximă</span><span class="spec-value">406 kW (544 CP)</span></div>
        <div class="spec-item"><span class="spec-label">Cutie de viteze</span><span class="spec-value">Automată</span></div>
        <div class="spec-item"><span class="spec-label">Tracțiune</span><span class="spec-value">4x4</span></div>
        <div class="spec-item"><span class="spec-label">Culoare</span><span class="spec-value">Verde închis</span></div>
      </div>
      <div class="autooutlet-description-block">
        <div class="autooutlet-description-content"><p>Cod Produs:205910</p><p>BYD Tang L description</p></div>
      </div>
      <div class="autooutlet-options-grid">
        <span class="autooutlet-spec-label">Heated Seats</span>
        <span class="autooutlet-spec-label">Cruise Control</span>
      </div>
    </main>
    <script>window.__i18n__={"sold":"Vândut","status":{"sold":"Vândute"}}</script>
  </body></html>`;
}

function buildSoldStrippedFixture(): string {
  return `<!DOCTYPE html><html><body>
    <script type="application/ld+json">${JSON.stringify({
      '@context': 'https://schema.org/',
      '@type': 'Car',
      name: 'BYD Sealion 06 2026',
      brand: { '@type': 'Brand', name: 'BYD' },
      model: 'Sealion 06',
      vehicleModelDate: '2026',
      offers: {
        '@type': 'Offer',
        priceCurrency: 'EUR',
        price: 20950,
        availability: 'https://schema.org/SoldOut',
      },
    })}</script>
    <div class="vehicle-badge vandut">Vândut</div>
  </body></html>`;
}

describe('autooutlet PDP parser', () => {
  it('parses LiXiang L6 fixture when sample file is present', () => {
    const pdpPath = path.join(
      __dirname,
      '../../../../../../../autooutlet/LiXiang L6 2024 - 34.990€ _ AutoOutlet.md.html',
    );
    if (!fs.existsSync(pdpPath)) {
      return;
    }
    const html = fs.readFileSync(pdpPath, 'utf-8');
    const url = 'https://autooutlet.md/vehicul/301742-lixiang-l6/';
    const parsed = parsePdpHtml(html, url);
    expect(parsed.sourceListingId).toBe('301742-lixiang-l6');
    expect(parsed.brand).toBe('LiXiang');
    expect(parsed.model).toBe('L6');
    expect(parsed.year).toBe(2024);
    expect(parsed.price).toBe(34990);
    expect(parsed.currency).toBe(Currency.EUR);
    expect(parsed.mileageKm).toBe(28000);
    expect(parsed.engineVolumeL).toBe(1.5);
    expect(parsed.fuelRaw).toContain('Plug');
    expect(parsed.gearboxRaw).toContain('Autom');
    expect(parsed.driveTypeRaw).toBe('4x4');
    expect(parsed.bodyRaw).toContain('Crossover');
    expect(parsed.colorRaw).toBe('Alb');
    expect(parsed.horsepowerFromPdp).toBe(408);
    expect(parsed.downPaymentAmount).toBe(3499);
    expect(parsed.monthlyPayment).toBe(651);
    expect(parsed.creditPeriodMonths).toBe(60);
    expect(parsed.images.length).toBe(15);
    expect(parsed.description_ro?.length).toBeGreaterThan(50);
    expect(parsed.equipmentOptions.length).toBeGreaterThan(0);
    expect(parsed.sourceStatus).toBe('active');
  });

  it('parses active Next.js PDP with gallery, specs, and options', () => {
    const parsed = parsePdpHtml(
      buildNextActiveFixture(),
      'https://autooutlet.md/vehicul/205910-byd-tang-l/',
      ['BYD'],
    );
    expect(parsed.sourceStatus).toBe('active');
    expect(parsed.sourceListingId).toBe('205910-byd-tang-l');
    expect(parsed.brand).toBe('BYD');
    expect(parsed.model).toBe('Tang L');
    expect(parsed.year).toBe(2025);
    expect(parsed.price).toBe(35490);
    expect(parsed.currency).toBe(Currency.EUR);
    expect(parsed.mileageKm).toBe(14000);
    expect(parsed.engineVolumeL).toBe(1.5);
    expect(parsed.horsepowerFromPdp).toBe(544);
    expect(parsed.fuelRaw).toBe('Plug-in Hybrid');
    expect(parsed.gearboxRaw).toBe('Automată');
    expect(parsed.driveTypeRaw).toBe('4x4');
    expect(parsed.colorRaw).toBe('Verde închis');
    expect(parsed.downPaymentAmount).toBe(7098);
    expect(parsed.monthlyPayment).toBe(587);
    expect(parsed.creditPeriodMonths).toBe(60);
    expect(parsed.sourcePostId).toBe('205910');
    expect(parsed.images).toEqual([SUPABASE_IMG_A, SUPABASE_IMG_B, SUPABASE_IMG_C]);
    expect(parsed.description_ro).toContain('Cod Produs:205910');
    expect(parsed.equipmentOptions.length).toBe(2);
    expect(parsed.warnings).not.toContain('MISSING_IMAGES');
    expect(parsed.warnings.some((w) => w.startsWith('SOURCE_CLOSED'))).toBe(false);
  });

  it('does not mark active PDP closed when i18n contains sold translation', () => {
    const parsed = parsePdpHtml(
      buildNextActiveFixture(),
      'https://autooutlet.md/vehicul/205910-byd-tang-l/',
      ['BYD'],
    );
    expect(parsed.sourceStatus).toBe('active');
    expect(parsed.sourceStatusReason).toBeUndefined();
  });

  it('marks sold stripped PDP as closed using JSON-LD availability', () => {
    const parsed = parsePdpHtml(
      buildSoldStrippedFixture(),
      'https://autooutlet.md/vehicul/755312-byd-sealion-06/',
      ['BYD'],
    );
    expect(parsed.sourceStatus).toBe('closed');
    expect(parsed.sourceStatusReason).toBe('sold_badge');
    expect(parsed.price).toBe(20950);
    expect(parsed.brand).toBe('BYD');
    expect(parsed.model).toBe('Sealion 06');
    expect(parsed.warnings.some((w) => w.startsWith('SOURCE_CLOSED'))).toBe(true);
  });

  it('marks sold PDP as closed from header badge', () => {
    const html = `<!DOCTYPE html><html><body class="postid-1"><main class="autooutlet-single-vehicle"><h1>X</h1><div class="autooutlet-header-badges"><span class="badge">VÂNDUT</span></div></main></body></html>`;
    const parsed = parsePdpHtml(html, 'https://autooutlet.md/vehicul/1-slug/');
    expect(parsed.sourceStatus).toBe('closed');
    expect(parsed.warnings.some((w) => w.startsWith('SOURCE_CLOSED'))).toBe(true);
  });

  it('adds warnings when price and images are missing', () => {
    const html = `<!DOCTYPE html><html><body class="postid-2"><main class="autooutlet-single-vehicle"><h1>Test Car 2020</h1><div class="autooutlet-header-badges"><span class="badge">Disponibil</span></div></main></body></html>`;
    const parsed = parsePdpHtml(html, 'https://autooutlet.md/vehicul/2-slug/');
    expect(parsed.warnings).toContain('MISSING_PRICE');
    expect(parsed.warnings).toContain('MISSING_IMAGES');
  });

  it('does not split Lynk & Co on first space when catalog brand list is missing', () => {
    const html = `<!DOCTYPE html><html><body class="postid-3"><main class="autooutlet-single-vehicle"><h1>Lynk &amp; Co 02 2024</h1><div class="autooutlet-header-badges"><span class="badge">Disponibil</span></div><div class="autooutlet-price"><span class="price-main">10.000€</span></div><script id="gallery-data">{"images":["https://autooutlet.md/a.jpg","https://autooutlet.md/b.jpg"]}</script></main></body></html>`;
    const parsed = parsePdpHtml(html, 'https://autooutlet.md/vehicul/3-lynk-co-02/');
    expect(parsed.brand).not.toBe('Lynk');
    expect(parsed.model).not.toBe('& Co 02');
    expect(parsed.model).toBe('Lynk & Co 02');
  });

  it('splits Lynk & Co from PDP title when catalog brand list is provided', () => {
    const html = `<!DOCTYPE html><html><body class="postid-3"><main class="autooutlet-single-vehicle"><h1>Lynk &amp; Co 02 2024</h1><div class="autooutlet-header-badges"><span class="badge">Disponibil</span></div><div class="autooutlet-price"><span class="price-main">10.000€</span></div><script id="gallery-data">{"images":["https://autooutlet.md/a.jpg","https://autooutlet.md/b.jpg"]}</script></main></body></html>`;
    const parsed = parsePdpHtml(html, 'https://autooutlet.md/vehicul/3-lynk-co-02/', ['Lynk & Co']);
    expect(parsed.brand).toBe('Lynk & Co');
    expect(parsed.model).toBe('02');
  });

  it('splits Lynk & Co 900 with trim suffix when catalog brand list is provided', () => {
    const html = `<!DOCTYPE html><html><body class="postid-4"><main class="autooutlet-single-vehicle"><h1>Lynk &amp; Co 900 (4x4) 2025</h1><div class="autooutlet-header-badges"><span class="badge">Disponibil</span></div><div class="autooutlet-price"><span class="price-main">51.800€</span></div><script id="gallery-data">{"images":["https://autooutlet.md/a.jpg","https://autooutlet.md/b.jpg"]}</script></main></body></html>`;
    const parsed = parsePdpHtml(html, 'https://autooutlet.md/vehicul/4-lynk-co-900/', [
      'Lynk & Co',
    ]);
    expect(parsed.brand).toBe('Lynk & Co');
    expect(parsed.model).toBe('900');
    expect(parsed.year).toBe(2025);
  });
});
