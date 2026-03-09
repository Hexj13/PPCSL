'use client';

import { useTranslation } from '@/hooks/useTranslation';
import { loadSiteConfigSync } from '@/lib/site-config';
import { getCountry } from '@/lib/utils';

const WHATSAPP_URL = 'https://wa.me/message/R3V326NKFJFGH1';
const TELEGRAM_BOT_URL = 'https://t.me/kupitoclub_bot';

export default function ContactsPage() {
  const { t } = useTranslation();
  const country = getCountry();
  const siteConfig = loadSiteConfigSync(country);

  const items = [
    {
      key: 'email' as const,
      href: `mailto:${siteConfig.supportEmail}`,
      labelKey: 'contacts.email' as const,
      value: siteConfig.supportEmail,
    },
    {
      key: 'telegram' as const,
      href: TELEGRAM_BOT_URL,
      labelKey: 'contacts.telegram' as const,
      value: '@kupitoclub_bot',
    },
    {
      key: 'whatsapp' as const,
      href: WHATSAPP_URL,
      labelKey: 'contacts.whatsapp' as const,
      value: t('contacts.whatsappValue'),
    },
  ];

  return (
    <div className="max-w-4xl mx-auto pt-10 md:pt-14">
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
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-5 px-1 sm:px-4 hover-only:hover:bg-primary-500/5 transition-colors duration-200 rounded-lg group"
              >
                <span className="flex items-center gap-3">
                  <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary-500/15 text-primary-700 font-bold text-sm shrink-0">
                    {index + 1}
                  </span>
                  <span className="font-semibold text-primary-800">{t(item.labelKey)}</span>
                </span>
                <span className="sm:ml-auto text-primary-600 group-hover:text-primary-500 break-all">
                  {item.value}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
