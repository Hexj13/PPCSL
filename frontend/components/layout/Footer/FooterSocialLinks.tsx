'use client';

import { useTranslation } from '@/hooks/useTranslation';
import type { SocialLinksConfig } from '@/lib/site-config';
import { TelegramIcon, TikTokIcon, WhatsAppIcon } from '@/ui/icons';

type FooterSocialLinksProps = {
  socialLinks?: SocialLinksConfig;
};

type SocialLinkItem = {
  href: string;
  labelKey: string;
  Icon: typeof TikTokIcon;
};

const footerSocialLinkClasses =
  'inline-flex items-center justify-center rounded-lg border border-white/40 p-2 text-white/80 transition-colors duration-200 hover-only:hover:border-white hover-only:hover:bg-white/5 hover-only:hover:text-white';

export function FooterSocialLinks({ socialLinks }: FooterSocialLinksProps) {
  const { t } = useTranslation();

  const items = [
    socialLinks?.tiktok
      ? { href: socialLinks.tiktok, labelKey: 'footer.tiktok', Icon: TikTokIcon }
      : null,
    socialLinks?.whatsapp
      ? { href: socialLinks.whatsapp, labelKey: 'contacts.whatsapp', Icon: WhatsAppIcon }
      : null,
    socialLinks?.telegram
      ? { href: socialLinks.telegram, labelKey: 'contacts.telegram', Icon: TelegramIcon }
      : null,
  ].filter((item): item is SocialLinkItem => item !== null);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {items.map(({ href, labelKey, Icon }) => (
        <a
          key={href}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={footerSocialLinkClasses}
          aria-label={t(labelKey)}
        >
          <Icon className="h-6 w-6" />
        </a>
      ))}
    </div>
  );
}
