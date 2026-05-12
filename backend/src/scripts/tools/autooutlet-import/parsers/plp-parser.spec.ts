import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  extractBrandOptions,
  extractSourceListingId,
  parseLoadVehiclesAjaxJson,
  parsePlpHtml,
  readMaxPagesFromCatalogHtml,
  splitTitleToBrandModel,
} from './plp-parser';

describe('autooutlet PLP parser', () => {
  const brandNames = ['LiXiang', 'Lynk & Co', 'Mercedes-Benz', 'BYD'];

  it('parses catalog HTML and extracts cards with ids, URLs, and prices', () => {
    const catalogPath = path.join(
      __dirname,
      '../../../../../../../autooutlet/Catalog Auto Second Hand Chișinău _ Mașini Rulate _ AutoOutlet.md.html',
    );
    if (!fs.existsSync(catalogPath)) {
      return;
    }
    const html = fs.readFileSync(catalogPath, 'utf-8');
    const brands = extractBrandOptions(html);
    const parsed = parsePlpHtml(html, brands);
    expect(parsed.items.length).toBe(24);
    expect(parsed.maxPages).toBe(7);
    const first = parsed.items[0];
    expect(extractSourceListingId(first.url)).toBeTruthy();
    expect(first.canonicalUrl).toMatch(/^https:\/\//);
  });

  it('reads max pages from vehiclesData script', () => {
    const html = `
      <script>window.vehiclesData = {};
      window.vehiclesData.maxPages = 12;
      </script>
    `;
    expect(readMaxPagesFromCatalogHtml(html)).toBe(12);
  });

  it('parses AJAX JSON with vehicles[].html', () => {
    const card =
      '<div class="car-card"><a class="car-card-link" href="https://autooutlet.md/vehicul/301742-x/"></a>' +
      '<h3 class="car-title">LiXiang L6</h3><div class="car-specs"><div class="car-spec">2024</div></div>' +
      '<span class="current-price">10.000€</span></div>';
    const raw = JSON.stringify({
      success: true,
      data: { vehicles: [{ html: card }], max_pages: 3 },
    });
    const parsed = parseLoadVehiclesAjaxJson(raw, brandNames);
    expect(parsed?.items.length).toBe(1);
    expect(parsed?.items[0].sourceListingId).toBe('301742-x');
    expect(parsed?.maxPages).toBe(3);
  });

  it('keeps separate listings when only leading digits match', () => {
    const html = `
      <div id="vehicles-grid">
        <div class="car-card"><a class="car-card-link" href="https://autooutlet.md/vehicul/1-a/"></a><h3 class="car-title">BYD X</h3><span class="current-price">1€</span><div class="car-specs"><div class="car-spec">2020</div></div></div>
        <div class="car-card"><a class="car-card-link" href="https://autooutlet.md/vehicul/1-b/"></a><h3 class="car-title">BYD X</h3><span class="current-price">2€</span><div class="car-specs"><div class="car-spec">2020</div></div></div>
      </div>`;
    const parsed = parsePlpHtml(html, ['BYD']);
    expect(parsed.items.length).toBe(2);
  });

  it('splits multi-word brands', () => {
    expect(splitTitleToBrandModel('LiXiang L6', brandNames).brand).toBe('LiXiang');
    expect(splitTitleToBrandModel('Lynk & Co 01', ['Lynk & Co', 'BYD']).brand).toBe('Lynk & Co');
    expect(splitTitleToBrandModel('Mercedes-Benz EQS SUV', brandNames).model).toBe('EQS SUV');
  });

  it('marks VÂNDUT PLP badge', () => {
    const html = `<div id="vehicles-grid"><div class="car-card"><a class="car-card-link" href="https://autooutlet.md/vehicul/9-x/"></a><div class="car-badge">VÂNDUT</div><h3 class="car-title">BYD X</h3><span class="current-price">1€</span><div class="car-specs"><div class="car-spec">2020</div></div></div></div>`;
    const parsed = parsePlpHtml(html, ['BYD']);
    expect(parsed.items[0].plpSoldBadge).toBe(true);
  });

  it('handles electric L engine spec without throwing', () => {
    const html = `<div id="vehicles-grid"><div class="car-card"><a class="car-card-link" href="https://autooutlet.md/vehicul/1-x/"></a><h3 class="car-title">BYD Tang L</h3><div class="car-specs"><div class="car-spec">2025</div><div class="car-spec">electric L</div></div><span class="current-price">1€</span></div></div>`;
    expect(() => parsePlpHtml(html, ['BYD'])).not.toThrow();
  });
});
