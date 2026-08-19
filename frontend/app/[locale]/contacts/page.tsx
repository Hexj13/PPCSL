'use client';

import { CopyButton } from '@/components/common/CopyButton';
import { useTranslation } from '@/hooks/useTranslation';
import { loadSiteConfigSync } from '@/lib/site-config';
import { telegramHandleFromUrl } from '@/lib/telegram-handle';
import { getCountry } from '@/lib/utils';
import { ExternalLinkIcon } from '@/ui';

export default function ContactsPage() {
  const { t } = useTranslation();
  const country = getCountry();
  const siteConfig = loadSiteConfigSync(country);
  const socialLinks = siteConfig.socialLinks;

  const items = [
    {
      key: 'email' as const,
      href: `mailto:${siteConfig.supportEmail}`,
      labelKey: 'contacts.email' as const,
      value: siteConfig.supportEmail,
      copyText: siteConfig.supportEmail,
    },
    ...(socialLinks?.telegram
      ? [
          {
            key: 'telegram' as const,
            href: socialLinks.telegram,
            labelKey: 'contacts.telegram' as const,
            value: telegramHandleFromUrl(socialLinks.telegram),
            copyText: socialLinks.telegram,
          },
        ]
      : []),
    ...(socialLinks?.whatsapp
      ? [
          {
            key: 'whatsapp' as const,
            href: socialLinks.whatsapp,
            labelKey: 'contacts.whatsapp' as const,
            value: t('contacts.whatsappValue'),
            copyText: socialLinks.whatsapp,
          },
        ]
      : []),
  ];

  return (
    <div className="max-w-4xl mx-auto pt-4 md:pt-6">
      <h1 className="text-4xl md:text-5xl font-extrabold mb-6 text-primary-900">
        {t('contacts.title')}
      </h1>
      <p
        className="text-base md:text-lg mb-10 leading-relaxed"
        style={{ color: 'rgb(var(--text-secondary-rgb))' }}
      >
        {t('contacts.intro')}
      </p>

      <div className="surface">
        <ul className="divide-y divide-primary-500/15">
          {items.map((item, index) => (
            <li key={item.key}>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-5 px-1 sm:px-4">
                <span className="flex items-center gap-3">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary-500/15 text-primary-700 font-bold text-sm shrink-0">
                    {index + 1}
                  </span>
                  <span className="font-semibold text-primary-800">{t(item.labelKey)}</span>
                </span>
                <span className="sm:ml-auto text-primary-600 break-all flex items-center gap-2 flex-wrap">
                  {item.value}
                  <span className="flex items-center gap-1 shrink-0">
                    <CopyButton
                      text={item.copyText}
                      label={t(item.labelKey)}
                      title={t('contacts.copyTitle')}
                      successMessageKey="admin.listingsTab.copySuccess"
                      errorMessageKey="admin.listingsTab.copyError"
                    />
                    {!item.href.startsWith('mailto:') && (
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 text-primary-400 hover-only:hover:text-primary-300 hover-only:hover:bg-primary-500/10 rounded-sm transition-colors shrink-0 inline-flex"
                        title={t('contacts.openInNewTab')}
                        aria-label={t('contacts.openInNewTab')}
                      >
                        <ExternalLinkIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                      </a>
                    )}
                  </span>
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
