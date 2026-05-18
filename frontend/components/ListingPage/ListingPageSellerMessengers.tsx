import { analytics, buildListingViewItemParams } from '@/lib/analytics';
import { type Listing } from '@/lib/api';
import { getTelegramUrl, getViberUrl, getWhatsAppUrl } from '@/lib/utils';

const MESSENGER_ICON_PATH =
  'M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14';

export function SellerMessengerLinks({
  listing,
  listingId,
  t,
  phoneForDial,
}: {
  listing: Listing;
  listingId: string;
  t: (k: string) => string;
  phoneForDial: string | null;
}) {
  const user = listing.user!;
  const hasAny = user.viber || user.whatsapp || user.telegram;
  if (listing.status === 'Closed' || !hasAny || !phoneForDial) return null;

  const track = (channel: 'viber' | 'whatsapp' | 'telegram') => {
    analytics.contactSeller(listingId, channel, buildListingViewItemParams(listing));
  };

  return (
    <div>
      <span className="font-semibold text-primary-700 mb-2 block">
        {t('listingDetail.availableMessengers')}:
      </span>
      <div className="flex flex-wrap gap-2">
        {user.viber && (
          <a
            href={getViberUrl(phoneForDial) || '#'}
            onClick={() => track('viber')}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-purple-500/20 text-purple-700 border border-purple-500/30 hover-only:hover:bg-purple-500/30 hover-only:hover:border-purple-500/50 transition-colors cursor-pointer"
          >
            {/* eslint-disable-next-line no-hardcoded-text/no-hardcoded-text */}
            <span>Viber</span>
            <svg
              className="w-3.5 h-3.5 opacity-70"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={MESSENGER_ICON_PATH}
              />
            </svg>
          </a>
        )}
        {user.whatsapp && (
          <a
            href={getWhatsAppUrl(phoneForDial) || '#'}
            onClick={() => track('whatsapp')}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary-500/20 text-primary-700 border border-primary-500/30 hover-only:hover:bg-primary-500/30 hover-only:hover:border-primary-500/50 transition-colors cursor-pointer"
          >
            {/* eslint-disable-next-line no-hardcoded-text/no-hardcoded-text */}
            <span>WhatsApp</span>
            <svg
              className="w-3.5 h-3.5 opacity-70"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={MESSENGER_ICON_PATH}
              />
            </svg>
          </a>
        )}
        {user.telegram && (
          <a
            href={getTelegramUrl(phoneForDial) || '#'}
            onClick={() => track('telegram')}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-500/20 text-blue-700 border border-blue-500/30 hover-only:hover:bg-blue-500/30 hover-only:hover:border-blue-500/50 transition-colors cursor-pointer"
          >
            {/* eslint-disable-next-line no-hardcoded-text/no-hardcoded-text */}
            <span>Telegram</span>
            <svg
              className="w-3.5 h-3.5 opacity-70"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={MESSENGER_ICON_PATH}
              />
            </svg>
          </a>
        )}
      </div>
    </div>
  );
}
