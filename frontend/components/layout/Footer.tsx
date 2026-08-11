'use client';

import { FooterAbout } from './Footer/FooterAbout';
import { FooterBottomBar } from './Footer/FooterBottomBar';
import { FooterCatalogLinks } from './Footer/FooterCatalogLinks';
import { FooterPartners } from './Footer/FooterPartners';
import { FooterSitemap } from './Footer/FooterSitemap';

export function Footer() {
  return (
    <footer className="mt-auto border-t-2 border-primary-500/20 bg-primary-700 text-white shadow-lg">
      <FooterPartners />
      <div className="bg-primary-700">
        <div className="container mx-auto grid grid-cols-1 gap-8 px-3 py-8 sm:grid-cols-2 sm:px-4 lg:flex lg:justify-between lg:gap-8">
          <FooterAbout />
          <FooterSitemap />
        </div>
      </div>
      <FooterCatalogLinks />
      <FooterBottomBar />
    </footer>
  );
}
