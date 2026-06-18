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
});
