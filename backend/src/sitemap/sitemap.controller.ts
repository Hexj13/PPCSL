import { Controller, Get, Header, NotFoundException, Param, Res } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Response } from 'express';

import { SitemapService } from './sitemap.service';

@Controller('api')
@SkipThrottle()
export class SitemapController {
  constructor(private readonly sitemapService: SitemapService) {}

  @Get('sitemap.txt')
  @Header('Content-Type', 'text/plain; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=3600, s-maxage=3600')
  async getSitemapText(@Res() res: Response) {
    const txt = await this.sitemapService.getSitemapText();
    res.send(txt);
  }

  @Get('sitemap.xml')
  @Header('Content-Type', 'application/xml; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=3600, s-maxage=3600')
  async getSitemapIndex(@Res() res: Response) {
    const xml = await this.sitemapService.getSitemapIndex();
    res.send(xml);
  }

  @Get('sitemaps/:name')
  @Header('Content-Type', 'application/xml; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=3600, s-maxage=3600')
  async getChildSitemap(@Param('name') name: string, @Res() res: Response) {
    if (!name.endsWith('.xml')) {
      throw new NotFoundException();
    }

    const baseName = name.replace('.xml', '');
    let xml: string | null = null;

    switch (baseName) {
      case 'pages':
        xml = await this.sitemapService.getPagesSitemap();
        break;
      case 'brands-car':
        xml = await this.sitemapService.getBrandsSitemapVehicleType('car');
        break;
      case 'brands-truck':
        xml = await this.sitemapService.getBrandsSitemapVehicleType('truck');
        break;
      case 'brands-moto':
        xml = await this.sitemapService.getBrandsSitemapVehicleType('moto');
        break;
      case 'sellers':
        xml = await this.sitemapService.getSellersSitemap();
        break;
      default:
        if (baseName.startsWith('listings-')) {
          const month = baseName.replace('listings-', '');
          xml = await this.sitemapService.getListingsSitemap(month);
        }
        break;
    }

    if (!xml) {
      throw new NotFoundException();
    }

    res.send(xml);
  }
}
