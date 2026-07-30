import { describe, expect, it } from '@jest/globals';

import { extractCipautoPostIdFromImageUrl, parsePlpHtml } from './plp-parser';

describe('extractCipautoPostIdFromImageUrl', () => {
  it('extracts post id from image names with an index suffix', () => {
    expect(
      extractCipautoPostIdFromImageUrl(
        'https://cipauto.md/wp-content/uploads/2026/06/volkswagen-passat-1-47993-5.jpg',
      ),
    ).toBe('47993');
  });

  it('extracts post id from image names without an index suffix', () => {
    expect(
      extractCipautoPostIdFromImageUrl(
        'https://cipauto.md/wp-content/uploads/2026/06/audi-q7-14-47863.png',
      ),
    ).toBe('47863');
  });
});

describe('parsePlpHtml', () => {
  it('reads sourcePostId from card images', () => {
    const parsed = parsePlpHtml(`
      <html>
        <body>
          <div class="single-card">
            <a class="single-link" href="https://cipauto.md/vehicul/123456-volkswagen-passat/">
              <img class="vehicle-card-img" src="https://cipauto.md/uploads/vw-1-47993-5.jpg" />
              <div class="single-vehicle-title">
                <span class="brand">Volkswagen</span>
                <span class="model">Passat</span>
                <span class="year">2020</span>
              </div>
              <div class="price-section">
                <span class="current-price">12900</span>
              </div>
            </a>
          </div>
        </body>
      </html>
    `);

    expect(parsed.items[0]).toMatchObject({
      sourceListingId: '123456-volkswagen-passat',
      sourcePostId: '47993',
    });
  });

  it('reads sourcePostId from JSON-LD images', () => {
    const parsed = parsePlpHtml(`
      <html>
        <head>
          <script type="application/ld+json">
            {
              "@type": "ItemList",
              "itemListElement": [
                {
                  "item": {
                    "url": "https://cipauto.md/vehicul/654321-audi-q7/",
                    "name": "Audi Q7 2021",
                    "image": ["https://cipauto.md/uploads/audi-q7-14-47863.png"],
                    "brand": { "name": "Audi" },
                    "offers": { "price": "39900", "priceCurrency": "EUR" }
                  }
                }
              ]
            }
          </script>
        </head>
      </html>
    `);

    expect(parsed.items[0]).toMatchObject({
      sourceListingId: '654321-audi-q7',
      sourcePostId: '47863',
    });
  });

  it('reads maxPages from pagination data-page attributes', () => {
    const parsed = parsePlpHtml(`
      <html>
        <body>
          <div class="vehicles-pagination" id="vehicles-pagination">
            <ul class="page-numbers">
              <li><div class="numbers-container">
                <span class="page-numbers current">1</span>
                <a href="/catalog-auto/page/2/" class="page-numbers" data-page="2">2</a>
                <span class="page-numbers dots">...</span>
                <a href="/catalog-auto/page/20/" class="page-numbers" data-page="20">20</a>
              </div></li>
              <li><a href="/catalog-auto/page/2/" class="page-numbers next" data-page="2">Next</a></li>
            </ul>
          </div>
          <div class="single-card">
            <a class="single-link" href="https://cipauto.md/vehicul/111-car/">
              <div class="single-vehicle-title">
                <span class="brand">Audi</span>
                <span class="model">A4</span>
                <span class="year">2019</span>
              </div>
              <div class="price-section"><span class="current-price">10000</span></div>
            </a>
          </div>
        </body>
      </html>
    `);

    expect(parsed.maxPages).toBe(20);
  });

  it('reads maxPages from the current page marker on the last page', () => {
    const parsed = parsePlpHtml(`
      <html>
        <body>
          <div class="vehicles-pagination" id="vehicles-pagination">
            <ul class="page-numbers">
              <li><div class="numbers-container">
                <a href="/catalog-auto/" class="page-numbers" data-page="1">1</a>
                <span class="page-numbers dots">...</span>
                <span class="page-numbers current">20</span>
              </div></li>
              <li><span class="page-numbers next disabled">Next</span></li>
            </ul>
          </div>
          <div class="single-card">
            <a class="single-link" href="https://cipauto.md/vehicul/222-car/">
              <div class="single-vehicle-title">
                <span class="brand">BMW</span>
                <span class="model">X5</span>
                <span class="year">2020</span>
              </div>
              <div class="price-section"><span class="current-price">20000</span></div>
            </a>
          </div>
        </body>
      </html>
    `);

    expect(parsed.maxPages).toBe(20);
  });

  it('falls back to vehicles-count when pagination is missing and more pages exist', () => {
    const cards = Array.from({ length: 24 }, (_, index) => {
      const id = 1000 + index;
      return `
        <div class="single-card">
          <a class="single-link" href="https://cipauto.md/vehicul/${id}-car/">
            <div class="single-vehicle-title">
              <span class="brand">Brand</span>
              <span class="model">Model</span>
              <span class="year">2020</span>
            </div>
            <div class="price-section"><span class="current-price">1000</span></div>
          </a>
        </div>
      `;
    }).join('');

    const parsed = parsePlpHtml(`
      <html>
        <head><link rel="next" href="https://cipauto.md/catalog-auto/page/2/" /></head>
        <body>
          <span id="vehicles-count">459</span>
          ${cards}
        </body>
      </html>
    `);

    expect(parsed.items).toHaveLength(24);
    expect(parsed.maxPages).toBe(20);
  });

  it('keeps legacy window.vehiclesData.maxPages support', () => {
    const parsed = parsePlpHtml(`
      <html>
        <body>
          <script>window.vehiclesData.maxPages = 15;</script>
          <div class="single-card">
            <a class="single-link" href="https://cipauto.md/vehicul/333-car/">
              <div class="single-vehicle-title">
                <span class="brand">Seat</span>
                <span class="model">Leon</span>
                <span class="year">2018</span>
              </div>
              <div class="price-section"><span class="current-price">8000</span></div>
            </a>
          </div>
        </body>
      </html>
    `);

    expect(parsed.maxPages).toBe(15);
  });
});
