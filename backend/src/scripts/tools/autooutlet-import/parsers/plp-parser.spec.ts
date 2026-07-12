import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  buildCatalogUrl,
  extractBrandNamesFromMarciPage,
  extractBrandOptions,
  extractSourceListingId,
  parseLoadVehiclesAjaxJson,
  parsePlpHtml,
  readMaxPagesFromCatalogHtml,
  splitTitleToBrandModel,
} from './plp-parser';

describe('autooutlet PLP parser', () => {
  const brandNames = ['LiXiang', 'Lynk & Co', 'Mercedes-Benz', 'BYD', 'Geely'];

  it('parses legacy WordPress catalog HTML and extracts cards with ids, URLs, and prices', () => {
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

  it('parses Next.js vehicle-card markup', () => {
    const html = `
      <p class="results-count">244 mașini disponibile</p>
      <nav>
        <button type="button" class="pagination-page active">1</button>
        <button type="button" class="pagination-page">2</button>
        <button type="button" class="pagination-page">11</button>
      </nav>
      <article class="vehicle-card">
        <div class="vehicle-image">
          <a href="/vehicul/390333-geely-galaxy-m9/"><img alt="Geely Galaxy M9" /></a>
        </div>
        <div class="vehicle-info">
          <h3 class="vehicle-title"><a href="/vehicul/390333-geely-galaxy-m9/">Geely Galaxy M9</a></h3>
          <p class="vehicle-specs">2025 • 14.000 km • 4x4 • Plug-in Hybrid • Automată</p>
          <span class="current-price">39 990€</span>
        </div>
      </article>
      <article class="vehicle-card">
        <div class="vehicle-image">
          <a href="/vehicul/755312-byd-sealion-06/"><img alt="BYD Sealion 06" /></a>
          <div class="vehicle-badge vandut">Vândut</div>
        </div>
        <div class="vehicle-info">
          <h3 class="vehicle-title"><a href="/vehicul/755312-byd-sealion-06/">BYD Sealion 06</a></h3>
          <p class="vehicle-specs">2026 • 100 km • Față • Plug-in Hybrid • Automată</p>
          <span class="current-price">20 950€</span>
        </div>
      </article>`;
    const parsed = parsePlpHtml(html, brandNames);
    expect(parsed.items.length).toBe(2);
    expect(parsed.items[0].sourceListingId).toBe('390333-geely-galaxy-m9');
    expect(parsed.items[0].brand).toBe('Geely');
    expect(parsed.items[0].model).toBe('Galaxy M9');
    expect(parsed.items[0].year).toBe(2025);
    expect(parsed.items[0].price).toBe(39990);
    expect(parsed.items[1].plpSoldBadge).toBe(true);
    expect(parsed.maxPages).toBe(11);
  });

  it('buildCatalogUrl uses page query for page > 1', () => {
    expect(buildCatalogUrl('https://autooutlet.md', 1)).toBe(
      'https://autooutlet.md/catalog-auto/?sort=newest',
    );
    expect(buildCatalogUrl('https://autooutlet.md', 2)).toBe(
      'https://autooutlet.md/catalog-auto/?sort=newest&page=2',
    );
  });

  it('reads max pages from vehiclesData script', () => {
    const html = `
      <script>window.vehiclesData = {};
      window.vehiclesData.maxPages = 12;
      </script>
    `;
    expect(readMaxPagesFromCatalogHtml(html)).toBe(12);
  });

  it('reads max pages from pagination buttons', () => {
    const html = `
      <button class="pagination-page">1</button>
      <button class="pagination-page">2</button>
      <button class="pagination-page">11</button>
    `;
    expect(readMaxPagesFromCatalogHtml(html)).toBe(11);
  });

  it('reads max pages from results count when pagination is missing', () => {
    const html = `<p class="results-count">244 mașini disponibile</p>`;
    expect(readMaxPagesFromCatalogHtml(html, 24)).toBe(11);
  });

  it('extracts brand names from marci-modele page', () => {
    const html = `
      <div class="brand-section">
        <h2 class="brand-name"><a href="/vanzari-auto-byd-in-chisinau/">BYD</a></h2>
      </div>
      <div class="brand-section">
        <h2 class="brand-name"><a href="/vanzari-auto-geely-in-chisinau/">Geely</a></h2>
      </div>
    `;
    expect(extractBrandNamesFromMarciPage(html)).toEqual(['Geely', 'BYD']);
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

  it('marks VÂNDUT PLP badge on legacy car-card', () => {
    const html = `<div id="vehicles-grid"><div class="car-card"><a class="car-card-link" href="https://autooutlet.md/vehicul/9-x/"></a><div class="car-badge">VÂNDUT</div><h3 class="car-title">BYD X</h3><span class="current-price">1€</span><div class="car-specs"><div class="car-spec">2020</div></div></div></div>`;
    const parsed = parsePlpHtml(html, ['BYD']);
    expect(parsed.items[0].plpSoldBadge).toBe(true);
  });

  it('handles electric L engine spec without throwing', () => {
    const html = `<div id="vehicles-grid"><div class="car-card"><a class="car-card-link" href="https://autooutlet.md/vehicul/1-x/"></a><h3 class="car-title">BYD Tang L</h3><div class="car-specs"><div class="car-spec">2025</div><div class="car-spec">electric L</div></div><span class="current-price">1€</span></div></div>`;
    expect(() => parsePlpHtml(html, ['BYD'])).not.toThrow();
  });
});
