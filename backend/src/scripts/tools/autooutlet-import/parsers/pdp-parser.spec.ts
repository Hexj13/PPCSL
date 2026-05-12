import * as fs from 'node:fs';
import * as path from 'node:path';

import { Currency } from '../../../../common/types';
import { parsePdpHtml } from './pdp-parser';

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

  it('marks sold PDP as closed', () => {
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
});
