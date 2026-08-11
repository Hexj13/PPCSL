'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import { HeaderListingsNavLink } from '@/components/layout/Header/HeaderListingsNavLink';
import { useLocalizedNavigation } from '@/hooks/useLocalizedNavigation';
import { useTranslation } from '@/hooks/useTranslation';
import { buildSignInHref, buildSignPageHref } from '@/lib/return-url';
import { useAuthStore } from '@/lib/store';

import {
  FOOTER_COLUMN_TITLE_CLASSES,
  FOOTER_LINK_CLASSES,
  FOOTER_LINK_LABEL_CLASSES,
} from './footerClasses';

function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <nav aria-label={title} className="flex flex-col gap-3">
      <h3 className={FOOTER_COLUMN_TITLE_CLASSES} suppressHydrationWarning>
        {title}
      </h3>
      <ul className="flex flex-col gap-2">{children}</ul>
    </nav>
  );
}

function FooterLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={FOOTER_LINK_CLASSES} suppressHydrationWarning>
      <span className={FOOTER_LINK_LABEL_CLASSES} suppressHydrationWarning>
        {children}
      </span>
    </Link>
  );
}

export function FooterSitemap() {
  const { t } = useTranslation();
  const { href } = useLocalizedNavigation();
  const user = useAuthStore((state) => state.user);
  const isInitialized = useAuthStore((state) => state.isInitialized);

  return (
    <>
      <FooterColumn title={t('footer.navTitle')}>
        <li>
          <Link
            href={user ? href('/listings/new') : buildSignInHref('/listings/new')}
            className={FOOTER_LINK_CLASSES}
            suppressHydrationWarning
          >
            <span className={FOOTER_LINK_LABEL_CLASSES} suppressHydrationWarning>
              {t('header.createListing')}
            </span>
          </Link>
        </li>
        <li>
          <HeaderListingsNavLink
            className={FOOTER_LINK_CLASSES}
            labelClassName={FOOTER_LINK_LABEL_CLASSES}
            t={t}
          />
        </li>
        <li>
          <Link
            href={user ? href('/favorites') : buildSignInHref('/favorites')}
            className={FOOTER_LINK_CLASSES}
            suppressHydrationWarning
          >
            <span className={FOOTER_LINK_LABEL_CLASSES} suppressHydrationWarning>
              {t('header.favorites')}
            </span>
          </Link>
        </li>
        <li>
          <FooterLink href={href('/compare')}>{t('header.compare')}</FooterLink>
        </li>
        <li>
          <FooterLink href={href('/partners')}>{t('header.forBusiness')}</FooterLink>
        </li>
        {isInitialized && !user && (
          <li>
            <FooterLink href={buildSignPageHref({ tab: 'login' })}>
              {t('header.loginAndRegister')}
            </FooterLink>
          </li>
        )}
        {isInitialized && user && (
          <>
            <li>
              <FooterLink href={href('/my-listings')}>{t('header.myListings')}</FooterLink>
            </li>
            <li>
              <FooterLink href={href('/profile')}>{t('header.profile')}</FooterLink>
            </li>
            {user.type === 'Admin' && (
              <li>
                <FooterLink href={href('/admin')}>{t('header.admin')}</FooterLink>
              </li>
            )}
          </>
        )}
      </FooterColumn>

      <FooterColumn title={t('footer.infoTitle')}>
        <li>
          <FooterLink href={href('/faq')}>{t('footer.faq')}</FooterLink>
        </li>
        <li>
          <FooterLink href={href('/partners')}>{t('footer.partners')}</FooterLink>
        </li>
        <li>
          <FooterLink href={href('/investors')}>{t('footer.investors')}</FooterLink>
        </li>
        <li>
          <FooterLink href={href('/contacts')}>{t('footer.contacts')}</FooterLink>
        </li>
      </FooterColumn>

      <FooterColumn title={t('footer.legalTitle')}>
        <li>
          <FooterLink href={href('/terms')}>{t('footer.terms')}</FooterLink>
        </li>
        <li>
          <FooterLink href={href('/privacy')}>{t('footer.privacy')}</FooterLink>
        </li>
        <li>
          <FooterLink href={href('/cookie-settings')}>{t('footer.cookieSettings')}</FooterLink>
        </li>
      </FooterColumn>
    </>
  );
}
