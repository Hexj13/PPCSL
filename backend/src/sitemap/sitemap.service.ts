import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Brand } from '../brands/entities/brand.entity';
import { VehicleModel } from '../brands/entities/vehicle-model.entity';
import { RedisService } from '../common/redis.service';
import { createSlug } from '../common/utils/slug.utils';
import { listingPublicPathSegment } from '../listings/application/utils/listing-url-slug.utils';
import { Listing } from '../listings/entities/listing.entity';
import { TireBrand } from '../tires/entities/tire-brand.entity';
import { TireModel } from '../tires/entities/tire-model.entity';
import { User } from '../users/entities/user.entity';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://kupito.club').replace(/\/$/, '');
const CACHE_TTL = 3600;
const CACHE_PREFIX = 'sitemap:v2:';

const BRAND_SITEMAP_VEHICLE_TYPES = ['car', 'truck', 'moto'] as const;
type BrandSitemapVehicleType = (typeof BRAND_SITEMAP_VEHICLE_TYPES)[number];

interface SitemapUrl {
  loc: string;
  lastmod: string;
  changefreq?: string;
  priority?: number;
}

@Injectable()
export class SitemapService {
  private brandsSitemapsBuild: Promise<Record<BrandSitemapVehicleType, string>> | null = null;

  constructor(
    @InjectRepository(Listing)
    private readonly listingRepo: Repository<Listing>,
    @InjectRepository(Brand)
    private readonly brandRepo: Repository<Brand>,
    @InjectRepository(VehicleModel)
    private readonly modelRepo: Repository<VehicleModel>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(TireBrand)
    private readonly tireBrandRepo: Repository<TireBrand>,
    @InjectRepository(TireModel)
    private readonly tireModelRepo: Repository<TireModel>,
    private readonly redis: RedisService,
  ) {}

  private ruAlternateLoc(roLoc: string): string {
    const u = new URL(roLoc);
    const pq = `${u.pathname}${u.search}`;
    if (pq === '/ru' || pq.startsWith('/ru/')) {
      return roLoc;
    }
    if (pq === '/' || pq === '') {
      return `${u.origin}/ru`;
    }
    return `${u.origin}/ru${pq}`;
  }

  private withRuDuplicates(urls: SitemapUrl[]): SitemapUrl[] {
    const out: SitemapUrl[] = [...urls];
    for (const entry of urls) {
      const altLoc = this.ruAlternateLoc(entry.loc);
      if (altLoc !== entry.loc) {
        out.push({ ...entry, loc: altLoc });
      }
    }
    return out;
  }

  async getSitemapIndex(): Promise<string> {
    const cached = await this.getFromCache('index');
    if (cached) return cached;

    const months = await this.getActiveListingMonths();
    const now = this.today();

    const sitemaps: { loc: string; lastmod: string }[] = [
      { loc: `${SITE_URL}/sitemaps/pages.xml`, lastmod: now },
      ...BRAND_SITEMAP_VEHICLE_TYPES.map((vt) => ({
        loc: `${SITE_URL}/sitemaps/brands-${vt}.xml`,
        lastmod: now,
      })),
      { loc: `${SITE_URL}/sitemaps/tires.xml`, lastmod: now },
      { loc: `${SITE_URL}/sitemaps/sellers.xml`, lastmod: now },
    ];

    for (const month of months) {
      sitemaps.push({
        loc: `${SITE_URL}/sitemaps/listings-${month}.xml`,
        lastmod: now,
      });
    }

    const xml = this.buildSitemapIndex(sitemaps);
    await this.saveToCache('index', xml);
    return xml;
  }

  async getSitemapText(): Promise<string> {
    const cached = await this.getFromCache('txt');
    if (cached) return cached;

    const months = await this.getActiveListingMonths();
    const xmlSitemaps: string[] = [
      await this.getPagesSitemap(),
      ...(await this.getBrandsSitemapUrlsetsForText()),
      await this.getTiresSitemap(),
      await this.getSellersSitemap(),
    ];

    for (const month of months) {
      const xml = await this.getListingsSitemap(month);
      if (xml) {
        xmlSitemaps.push(xml);
      }
    }

    const urls = xmlSitemaps.flatMap((xml) => this.extractLocValues(xml));
    const txt = `${Array.from(new Set(urls)).join('\n')}\n`;

    await this.saveToCache('txt', txt);
    return txt;
  }

  async getPagesSitemap(): Promise<string> {
    const cached = await this.getFromCache('pages');
    if (cached) return cached;

    const now = this.today();
    const urls: SitemapUrl[] = [
      { loc: SITE_URL, lastmod: now, changefreq: 'daily', priority: 1.0 },
      { loc: `${SITE_URL}/listings`, lastmod: now, changefreq: 'daily', priority: 0.9 },
      { loc: `${SITE_URL}/terms`, lastmod: now, changefreq: 'monthly', priority: 0.3 },
      { loc: `${SITE_URL}/privacy`, lastmod: now, changefreq: 'monthly', priority: 0.3 },
      { loc: `${SITE_URL}/faq`, lastmod: now, changefreq: 'monthly', priority: 0.4 },
      { loc: `${SITE_URL}/partners`, lastmod: now, changefreq: 'monthly', priority: 0.4 },
      { loc: `${SITE_URL}/contacts`, lastmod: now, changefreq: 'monthly', priority: 0.3 },
      { loc: `${SITE_URL}/cookie-settings`, lastmod: now, changefreq: 'monthly', priority: 0.2 },
    ];

    const xml = this.buildUrlset(this.withRuDuplicates(urls));
    await this.saveToCache('pages', xml);
    return xml;
  }

  async getTiresSitemap(): Promise<string> {
    const cached = await this.getFromCache('tires');
    if (cached) return cached;

    const now = this.today();
    const urls: SitemapUrl[] = [
      {
        loc: `${SITE_URL}/?category=tire`,
        lastmod: now,
        changefreq: 'daily',
        priority: 0.85,
      },
    ];

    const tireBrands = await this.tireBrandRepo.find({
      where: { is_archived: false },
      select: ['id', 'name'],
      order: { name: 'ASC' },
    });

    for (const b of tireBrands) {
      urls.push({
        loc: `${SITE_URL}/?category=tire&tire_brand_ids=${encodeURIComponent(b.id)}`,
        lastmod: now,
        changefreq: 'daily',
        priority: 0.75,
      });
    }

    const tireModels = await this.tireModelRepo
      .createQueryBuilder('model')
      .select(['model.id', 'model.brand_id'])
      .innerJoin('model.brand', 'brand')
      .where('model.is_archived = :archived', { archived: false })
      .andWhere('brand.is_archived = :barchived', { barchived: false })
      .orderBy('brand.name', 'ASC')
      .addOrderBy('model.name', 'ASC')
      .getMany();

    for (const m of tireModels) {
      const qs = new URLSearchParams({
        category: 'tire',
        tire_brand_ids: m.brand_id,
        tire_model_ids: m.id,
      });
      urls.push({
        loc: `${SITE_URL}/?${qs.toString()}`,
        lastmod: now,
        changefreq: 'weekly',
        priority: 0.65,
      });
    }

    const xml = this.buildUrlset(this.withRuDuplicates(urls));
    await this.saveToCache('tires', xml);
    return xml;
  }

  async getBrandsSitemapVehicleType(vehicleType: BrandSitemapVehicleType): Promise<string> {
    const all = await this.ensureBrandsSitemapsBuilt();
    return all[vehicleType];
  }

  private async getBrandsSitemapUrlsetsForText(): Promise<string[]> {
    const all = await this.ensureBrandsSitemapsBuilt();
    return BRAND_SITEMAP_VEHICLE_TYPES.map((vt) => all[vt]);
  }

  private isBrandSitemapVehicleType(v: string): v is BrandSitemapVehicleType {
    return (BRAND_SITEMAP_VEHICLE_TYPES as readonly string[]).includes(v);
  }

  private modelBrandSitemapVehicleTypes(model: VehicleModel): BrandSitemapVehicleType[] {
    const raw = model.vehicle_types || [];
    const filtered = raw.filter((t): t is BrandSitemapVehicleType =>
      this.isBrandSitemapVehicleType(t),
    );
    const unique = [...new Set(filtered)];
    if (unique.length === 0) {
      return ['car'];
    }
    return unique;
  }

  private groupBrandModelUrlsByVehicleType(
    brands: Brand[],
    models: VehicleModel[],
    now: string,
  ): Record<BrandSitemapVehicleType, SitemapUrl[]> {
    const grouped: Record<BrandSitemapVehicleType, SitemapUrl[]> = {
      car: [],
      truck: [],
      moto: [],
    };

    for (const brand of brands) {
      const slug = createSlug(brand.name);
      if (!slug) continue;

      const vehicleTypes = brand.vehicle_types || [];
      let types: BrandSitemapVehicleType[] =
        vehicleTypes.length > 0
          ? vehicleTypes.filter((t): t is BrandSitemapVehicleType =>
              this.isBrandSitemapVehicleType(t),
            )
          : ['car'];
      if (types.length === 0) {
        types = ['car'];
      }

      for (const vt of types) {
        const param = vt !== 'car' ? `?vehicleType=${vt}` : '';
        grouped[vt].push({
          loc: `${SITE_URL}/${slug}${param}`,
          lastmod: now,
          changefreq: 'daily',
          priority: 0.8,
        });
      }
    }

    for (const model of models) {
      if (!model.brand) continue;
      const brandSlug = createSlug(model.brand.name);
      const modelSlug = createSlug(model.name);
      if (!brandSlug || !modelSlug) continue;

      for (const vt of this.modelBrandSitemapVehicleTypes(model)) {
        const param = vt !== 'car' ? `?vehicleType=${vt}` : '';
        grouped[vt].push({
          loc: `${SITE_URL}/${brandSlug}/${modelSlug}${param}`,
          lastmod: now,
          changefreq: 'daily',
          priority: 0.7,
        });
      }
    }

    return grouped;
  }

  private async readBrandsSitemapsFromCache(): Promise<Record<
    BrandSitemapVehicleType,
    string
  > | null> {
    const result = {} as Record<BrandSitemapVehicleType, string>;
    for (const vt of BRAND_SITEMAP_VEHICLE_TYPES) {
      const xml = await this.getFromCache(`brands-${vt}`);
      if (xml === null) {
        return null;
      }
      result[vt] = xml;
    }
    return result;
  }

  private async ensureBrandsSitemapsBuilt(): Promise<Record<BrandSitemapVehicleType, string>> {
    const cached = await this.readBrandsSitemapsFromCache();
    if (cached) {
      return cached;
    }
    if (!this.brandsSitemapsBuild) {
      this.brandsSitemapsBuild = this.computeAllBrandsSitemaps().finally(() => {
        this.brandsSitemapsBuild = null;
      });
    }
    return this.brandsSitemapsBuild;
  }

  private async computeAllBrandsSitemaps(): Promise<Record<BrandSitemapVehicleType, string>> {
    const now = this.today();
    const brands = await this.brandRepo.find({
      where: { is_archived: false },
      select: ['id', 'name', 'vehicle_types'],
      order: { name: 'ASC' },
    });
    const models = await this.modelRepo
      .createQueryBuilder('model')
      .select(['model.id', 'model.name', 'model.vehicle_types', 'model.brand_id'])
      .addSelect(['brand.id', 'brand.name'])
      .innerJoin('model.brand', 'brand')
      .where('model.is_archived = :archived', { archived: false })
      .andWhere('brand.is_archived = :barchived', { barchived: false })
      .orderBy('model.name', 'ASC')
      .getMany();

    const grouped = this.groupBrandModelUrlsByVehicleType(brands, models, now);
    const result = {} as Record<BrandSitemapVehicleType, string>;

    for (const vt of BRAND_SITEMAP_VEHICLE_TYPES) {
      const urls = grouped[vt];
      const xml = this.buildUrlset(this.withRuDuplicates(urls));
      result[vt] = xml;
      await this.saveToCache(`brands-${vt}`, xml);
    }

    return result;
  }

  async getSellersSitemap(): Promise<string> {
    const cached = await this.getFromCache('sellers');
    if (cached) return cached;

    const rows: { board_slug: string; last_updated: string }[] = await this.userRepo.query(
      `SELECT u.board_slug, MAX(l.updated_at)::text AS last_updated
       FROM users u
       JOIN listings l ON l.user_id = u.id
       WHERE u.active = true
         AND u.board_slug IS NOT NULL
         AND l.status = 'Active'
       GROUP BY u.board_slug
       ORDER BY u.board_slug`,
    );

    const urls: SitemapUrl[] = rows.map((r) => ({
      loc: `${SITE_URL}/board/${r.board_slug}`,
      lastmod: r.last_updated.split('T')[0].split(' ')[0],
      changefreq: 'daily',
      priority: 0.6,
    }));

    const xml = this.buildUrlset(this.withRuDuplicates(urls));
    await this.saveToCache('sellers', xml);
    return xml;
  }

  async getListingsSitemap(month: string): Promise<string | null> {
    if (!/^\d{4}-\d{2}$/.test(month)) return null;

    const cacheKey = `listings-${month}`;
    const cached = await this.getFromCache(cacheKey);
    if (cached) return cached;

    const [year, mon] = month.split('-').map(Number);
    const startDate = new Date(year, mon - 1, 1);
    const endDate = new Date(year, mon, 1);

    const BATCH_SIZE = 5000;
    const urlEntries: string[] = [];
    let offset = 0;
    let hasMore = true;

    while (hasMore) {
      const batch: { id: string; updated_at: Date; slug: string | null }[] = await this.listingRepo
        .createQueryBuilder('l')
        .select(['l.id', 'l.updated_at', 'l.slug'])
        .where('l.status = :status', { status: 'Active' })
        .andWhere('l.created_at >= :start', { start: startDate })
        .andWhere('l.created_at < :end', { end: endDate })
        .orderBy('l.updated_at', 'DESC')
        .addOrderBy('l.id', 'ASC')
        .skip(offset)
        .take(BATCH_SIZE)
        .getMany();

      for (const l of batch) {
        const pathSeg = listingPublicPathSegment(l.slug, l.id);
        const roLoc = `${SITE_URL}/listings/${pathSeg}`;
        const ruLoc = this.ruAlternateLoc(roLoc);
        const lastmod = l.updated_at.toISOString().split('T')[0];
        urlEntries.push(
          `  <url>\n    <loc>${this.escapeXml(roLoc)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>hourly</changefreq>\n    <priority>0.9</priority>\n  </url>`,
        );
        urlEntries.push(
          `  <url>\n    <loc>${this.escapeXml(ruLoc)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>hourly</changefreq>\n    <priority>0.9</priority>\n  </url>`,
        );
      }

      hasMore = batch.length === BATCH_SIZE;
      offset += BATCH_SIZE;
    }

    if (urlEntries.length === 0) return null;

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urlEntries.join('\n')}\n</urlset>\n`;
    await this.saveToCache(cacheKey, xml);
    return xml;
  }

  private async getActiveListingMonths(): Promise<string[]> {
    const rows: { month: string }[] = await this.listingRepo.query(
      `SELECT DISTINCT TO_CHAR(created_at, 'YYYY-MM') AS month
       FROM listings
       WHERE status = 'Active'
       ORDER BY month DESC`,
    );
    return rows.map((r) => r.month);
  }

  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private unescapeXml(str: string): string {
    return str
      .replace(/&apos;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&gt;/g, '>')
      .replace(/&lt;/g, '<')
      .replace(/&amp;/g, '&');
  }

  private extractLocValues(xml: string): string[] {
    const matches = xml.matchAll(/<loc>(.*?)<\/loc>/g);
    return Array.from(matches, (match) => this.unescapeXml(match[1].trim()));
  }

  private buildSitemapIndex(sitemaps: { loc: string; lastmod: string }[]): string {
    const entries = sitemaps
      .map(
        (s) =>
          `  <sitemap>\n    <loc>${this.escapeXml(s.loc)}</loc>\n    <lastmod>${s.lastmod}</lastmod>\n  </sitemap>`,
      )
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</sitemapindex>\n`;
  }

  private buildUrlset(urls: SitemapUrl[]): string {
    const entries = urls
      .map((u) => {
        let xml = `  <url>\n    <loc>${this.escapeXml(u.loc)}</loc>\n    <lastmod>${u.lastmod}</lastmod>`;
        if (u.changefreq) xml += `\n    <changefreq>${u.changefreq}</changefreq>`;
        if (u.priority !== undefined) xml += `\n    <priority>${u.priority}</priority>`;
        xml += '\n  </url>';
        return xml;
      })
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
  }

  private today(): string {
    return new Date().toISOString().split('T')[0];
  }

  private async getFromCache(name: string): Promise<string | null> {
    try {
      return await this.redis.get(`${CACHE_PREFIX}${name}`);
    } catch {
      return null;
    }
  }

  private async saveToCache(name: string, xml: string): Promise<void> {
    try {
      await this.redis.set(`${CACHE_PREFIX}${name}`, xml, CACHE_TTL);
    } catch {
      // Redis write failure is non-critical
    }
  }
}
