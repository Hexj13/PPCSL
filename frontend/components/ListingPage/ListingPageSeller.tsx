'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { CopyButton } from '@/components/common/CopyButton';
import { PlatformPartnerBadge } from '@/components/common/PlatformPartnerBadge';
import { useI18n } from '@/components/providers/I18nProvider';
import { useCities } from '@/hooks/useCities';
import { useShouldOpenLinkInNewTab } from '@/hooks/useShouldOpenLinkInNewTab';
import { useTranslation } from '@/hooks/useTranslation';
import { analytics, buildListingViewItemParams } from '@/lib/analytics';
import { listingsApi, type Listing } from '@/lib/api';
import { compactE164Phone, formatPhoneForDisplay } from '@/lib/phone';
import { useAuthStore } from '@/lib/store';
import { toast } from '@/lib/toast';
import { getCityName } from '@/lib/utils';
import { EyeIcon, EyeSlashIcon } from '@/ui';

import { SellerMessengerLinks } from './ListingPageSellerMessengers';

const BTN_CLASS =
  'p-1 text-primary-400 hover-only:hover:text-primary-300 hover-only:hover:bg-primary-500/10 rounded-sm transition-colors shrink-0';

const BOARD_ICON_PATH =
  'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z';

const MASKED_CONTACT = '••••••••';

function useListingPhonesReveal(listingId: string) {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [fullPhones, setFullPhones] = useState<{
    phone: string | null;
    additionalPhone: string | null;
  } | null>(null);
  const inFlightRef = useRef<Promise<{
    phone: string | null;
    additionalPhone: string | null;
  }> | null>(null);

  useEffect(() => {
    setFullPhones(null);
    inFlightRef.current = null;
  }, [listingId]);

  const ensureFull = useCallback(async () => {
    if (fullPhones) {
      return fullPhones;
    }
    if (inFlightRef.current) {
      return inFlightRef.current;
    }
    const req = listingsApi
      .getPhones(listingId)
      .then((res) => {
        setFullPhones(res.data);
        return res.data;
      })
      .catch((err: { response?: { status?: number; data?: { message?: string } } }) => {
        if (err?.response?.status === 429) {
          const backendMsg = err.response?.data?.message;
          const fallback = user
            ? t('listingDetail.phoneRateLimitExceededAuth')
            : t('listingDetail.phoneRateLimitExceededGuest');
          const msg =
            typeof backendMsg === 'string' && backendMsg.startsWith('errors.')
              ? fallback
              : backendMsg || fallback;
          toast.error(msg);
        } else {
          toast.error(t('listingDetail.phoneLoadError'));
        }
        throw err;
      });
    inFlightRef.current = req;
    try {
      return await req;
    } finally {
      inFlightRef.current = null;
    }
  }, [listingId, fullPhones, t, user]);

  return { ensureFull, fullPhones };
}

function ListingPhoneRow({
  field,
  maskedDisplay,
  fullValue,
  labelForCopy,
  onAnalyticsPhoneClick,
  ensureFull,
  revealTitleKey,
  hideTitleKey,
  plainContactsMode = false,
  contactRevealNonce = 0,
}: {
  field: 'phone' | 'additionalPhone';
  maskedDisplay: string;
  fullValue: string | null;
  labelForCopy: string;
  onAnalyticsPhoneClick?: () => void;
  ensureFull: () => Promise<{ phone: string | null; additionalPhone: string | null }>;
  revealTitleKey: string;
  hideTitleKey: string;
  plainContactsMode?: boolean;
  contactRevealNonce?: number;
}) {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [localPlain, setLocalPlain] = useState<string | null>(null);

  useEffect(() => {
    setLocalPlain(null);
    setShow(false);
  }, [maskedDisplay]);

  const revealPhone = useCallback(async () => {
    if (show || busy) return;
    setBusy(true);
    try {
      const data = await ensureFull();
      const unlocked = field === 'phone' ? data.phone : data.additionalPhone;
      if (unlocked) {
        setLocalPlain(unlocked);
        setShow(true);
      }
    } catch {
    } finally {
      setBusy(false);
    }
  }, [show, busy, ensureFull, field]);

  const lastRevealNonceRef = useRef(0);
  useEffect(() => {
    if (plainContactsMode || contactRevealNonce <= 0) return;
    if (contactRevealNonce === lastRevealNonceRef.current) return;
    lastRevealNonceRef.current = contactRevealNonce;
    if (!show) {
      void revealPhone();
    }
  }, [contactRevealNonce, plainContactsMode, show, revealPhone]);

  const plainStatic =
    plainContactsMode && maskedDisplay && !maskedDisplay.includes('*') ? maskedDisplay : null;
  if (plainStatic) {
    const displayPlainStatic = formatPhoneForDisplay(plainStatic);
    return (
      <div className="flex items-center min-w-0 flex-wrap gap-1">
        <span className="min-w-0 break-all text-text-secondary">
          <a
            href={`tel:${compactE164Phone(plainStatic)}`}
            onClick={onAnalyticsPhoneClick}
            className="hover-only:hover:text-primary-700 transition-colors underline"
          >
            {displayPlainStatic}
          </a>
        </span>
        <CopyButton
          text={displayPlainStatic}
          label={labelForCopy}
          successMessageKey="listingDetail.copied"
          errorMessageKey="listingDetail.copyError"
          title={t('listingDetail.copyPhone')}
          className="shrink-0"
          iconClassName="w-4 h-4"
        />
      </div>
    );
  }

  const plain = fullValue || localPlain;
  const showPlain = show && plain;
  const displayPlain = plain ? formatPhoneForDisplay(plain) : '';
  const maskedFormatted = formatPhoneForDisplay(maskedDisplay);

  const handleToggle = async () => {
    if (show) {
      setShow(false);
      return;
    }
    await revealPhone();
  };

  return (
    <div className="flex items-center min-w-0 flex-wrap gap-1">
      <span className="min-w-0 break-all text-text-secondary">
        {showPlain && plain ? (
          <a
            href={`tel:${compactE164Phone(plain)}`}
            onClick={onAnalyticsPhoneClick}
            className="hover-only:hover:text-primary-700 transition-colors underline"
          >
            {displayPlain}
          </a>
        ) : (
          maskedFormatted
        )}
      </span>
      <button
        type="button"
        onClick={handleToggle}
        disabled={busy}
        className={BTN_CLASS}
        title={show ? t(hideTitleKey) : t(revealTitleKey)}
        aria-label={show ? t(hideTitleKey) : t(revealTitleKey)}
      >
        {show ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
      </button>
      {showPlain && plain && (
        <CopyButton
          text={displayPlain}
          label={labelForCopy}
          successMessageKey="listingDetail.copied"
          errorMessageKey="listingDetail.copyError"
          title={t('listingDetail.copyPhone')}
          className="shrink-0"
          iconClassName="w-4 h-4"
        />
      )}
    </div>
  );
}

function SellerBoardLink({
  listing,
  activeListingsCount,
  boardSlug,
  t,
}: {
  listing: Listing;
  activeListingsCount: number;
  boardSlug: string | null;
  t: (k: string) => string;
}) {
  const openInNewTab = useShouldOpenLinkInNewTab();

  if (!listing.user || activeListingsCount <= 1 || !boardSlug) return null;
  const icon = (
    <svg
      className="w-3.5 h-3.5 md:w-4 md:h-4 shrink-0"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={BOARD_ICON_PATH} />
    </svg>
  );
  const label = t('listingDetail.allListingsFromSeller');
  if (listing.status === 'Closed') {
    return (
      <span
        className="w-full min-h-12 px-4 md:px-8 py-2 md:py-2.5 text-sm md:text-base rounded-lg font-medium flex items-center justify-center gap-2 bg-bg-darker text-text-secondary border-2 border-divider cursor-not-allowed opacity-50"
        title={t('listingDetail.unavailableForClosed')}
      >
        {icon}
        <span className="whitespace-nowrap">{label}</span>
      </span>
    );
  }
  return (
    <a
      href={`/board/${boardSlug}`}
      {...(openInNewTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className="w-full min-h-12 px-4 md:px-8 py-2 md:py-2.5 text-sm md:text-base rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 text-primary-700 hover-only:hover:text-primary-900 hover-only:hover:border-primary-900 active:text-primary-900 active:border-primary-900 border-2 border-primary-700 bg-primary-500/10! select-none"
    >
      {icon}
      <span className="whitespace-nowrap">{label}</span>
    </a>
  );
}

interface ListingPageSellerProps {
  listing: Listing;
  listingId: string;
  activeListingsCount: number;
  boardSlug: string | null;
  contactRevealNonce?: number;
}

type ListingUser = NonNullable<Listing['user']>;

function getPrimaryPhoneContactLabel(
  t: (key: string) => string,
  isBusiness: boolean,
  additionalPhone: string | null | undefined,
): string {
  return isBusiness && additionalPhone
    ? t('listingDetail.phone')
    : t('listingDetail.phoneWhenSole');
}

function SellerPublicProfileSummary({
  listing,
  user,
  isBusiness,
  isClosed,
  locale,
  cities,
  secondaryStyle,
  t,
}: {
  listing: Listing;
  user: ListingUser;
  isBusiness: boolean;
  isClosed: boolean;
  locale: string;
  cities: ReturnType<typeof useCities>['cities'];
  secondaryStyle: { color: string };
  t: (key: string) => string;
}) {
  return (
    <>
      <div>
        <span className="font-semibold text-primary-700">{t('listingDetail.sellerType')}:</span>
        <span className="ml-2" style={secondaryStyle}>
          {isBusiness ? t('listingDetail.business') : t('listingDetail.individual')}
        </span>
      </div>

      {user.firstName && (
        <div>
          <span className="font-semibold text-primary-700">{t('listingDetail.name')}:</span>
          <span
            className={isClosed ? 'ml-2 text-text-secondary' : 'ml-2'}
            style={isClosed ? undefined : secondaryStyle}
          >
            {isClosed ? MASKED_CONTACT : user.firstName}
          </span>
        </div>
      )}

      {isBusiness && user.companyName && (
        <div>
          <span className="font-semibold text-primary-700">{t('listingDetail.company')}:</span>
          <span
            className={isClosed ? 'ml-2 text-text-secondary' : 'ml-2'}
            style={isClosed ? undefined : secondaryStyle}
          >
            {isClosed ? MASKED_CONTACT : user.companyName}
          </span>
        </div>
      )}

      {isBusiness && user.companyWebsiteUrl && (
        <div className="flex items-center min-w-0 gap-2">
          <span className="font-semibold text-primary-700 shrink-0">
            {t('listingDetail.companyWebsite')}:
          </span>
          {isClosed ? (
            <span className="ml-2 text-text-secondary">{MASKED_CONTACT}</span>
          ) : (
            <a
              href={user.companyWebsiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-w-0 truncate text-text-secondary hover-only:hover:text-primary-700 transition-colors underline"
              title={user.companyWebsiteUrl}
            >
              {user.companyWebsiteUrl}
            </a>
          )}
        </div>
      )}

      <div>
        <span className="font-semibold text-primary-700">{t('listingDetail.city')}:</span>
        <span className="ml-2" style={secondaryStyle}>
          {getCityName(listing.city, locale, cities)}
        </span>
      </div>
    </>
  );
}

function ListingSellerContactsWhenClosed({
  user,
  isBusiness,
  t,
}: {
  user: ListingUser;
  isBusiness: boolean;
  t: (key: string) => string;
}) {
  const primaryPhoneLabel = getPrimaryPhoneContactLabel(t, isBusiness, user.additionalPhone);
  return (
    <>
      {user.email && (
        <div>
          <span className="font-semibold text-primary-700">{t('listingDetail.email')}:</span>
          <span className="ml-2 text-text-secondary">{MASKED_CONTACT}</span>
        </div>
      )}
      {user.phone && (
        <div className="border-t border-primary-500/20 pt-4">
          <span className="font-semibold text-primary-700 block">{primaryPhoneLabel}:</span>
          <span className="text-text-secondary">{MASKED_CONTACT}</span>
        </div>
      )}
      {isBusiness && user.additionalPhone && (
        <div>
          <span className="font-semibold text-primary-700 block">
            {t('listingDetail.additionalPhone')}:
          </span>
          <span className="text-text-secondary">{MASKED_CONTACT}</span>
        </div>
      )}
    </>
  );
}

function ListingSellerContactsWhenOpen({
  user,
  listing,
  listingId,
  isBusiness,
  t,
  ensureFull,
  fullPhones,
  plainContactsMode,
  contactRevealNonce,
}: {
  user: ListingUser;
  listing: Listing;
  listingId: string;
  isBusiness: boolean;
  t: (key: string) => string;
  ensureFull: () => Promise<{ phone: string | null; additionalPhone: string | null }>;
  fullPhones: { phone: string | null; additionalPhone: string | null } | null;
  plainContactsMode: boolean;
  contactRevealNonce?: number;
}) {
  const primaryPhoneLabel = getPrimaryPhoneContactLabel(t, isBusiness, user.additionalPhone);
  return (
    <>
      {user.email && (
        <div className="flex items-center min-w-0">
          <span className="font-semibold text-primary-700 shrink-0">
            {t('listingDetail.email')}:
          </span>
          <a
            href={`mailto:${user.email}`}
            className="ml-2 text-text-secondary hover-only:hover:text-primary-700 transition-colors underline break-all min-w-0"
          >
            {user.email}
          </a>
          <CopyButton
            text={user.email}
            label={t('listingDetail.email')}
            successMessageKey="listingDetail.copied"
            errorMessageKey="listingDetail.copyError"
            title={t('listingDetail.copyEmail')}
            className="ml-2"
            iconClassName="w-4 h-4"
          />
        </div>
      )}
      {user.phone && (
        <div className="min-w-0 border-t border-primary-500/20 pt-4">
          <span className="font-semibold text-primary-700 mb-2 block">{primaryPhoneLabel}:</span>
          <ListingPhoneRow
            key={`${listingId}-phone`}
            field="phone"
            maskedDisplay={user.phone}
            fullValue={fullPhones?.phone ?? null}
            labelForCopy={primaryPhoneLabel}
            onAnalyticsPhoneClick={() =>
              analytics.contactSeller(listingId, 'phone', buildListingViewItemParams(listing))
            }
            ensureFull={ensureFull}
            revealTitleKey="listingDetail.revealPhone"
            hideTitleKey="listingDetail.hidePhone"
            plainContactsMode={plainContactsMode}
            contactRevealNonce={contactRevealNonce}
          />
        </div>
      )}
      {isBusiness && user.additionalPhone && (
        <div>
          <span className="font-semibold text-primary-700 mb-2 block">
            {t('listingDetail.additionalPhone')}:
          </span>
          <ListingPhoneRow
            key={`${listingId}-additional`}
            field="additionalPhone"
            maskedDisplay={user.additionalPhone}
            fullValue={fullPhones?.additionalPhone ?? null}
            labelForCopy={t('listingDetail.additionalPhone')}
            ensureFull={ensureFull}
            revealTitleKey="listingDetail.revealAdditionalPhone"
            hideTitleKey="listingDetail.hideAdditionalPhone"
            plainContactsMode={plainContactsMode}
          />
        </div>
      )}
    </>
  );
}

function ListingPageSellerInner({
  listing,
  listingId: id,
  activeListingsCount,
  boardSlug,
  contactRevealNonce,
}: ListingPageSellerProps) {
  const { t } = useTranslation();
  const { locale } = useI18n();
  const { cities } = useCities();
  const { ensureFull, fullPhones } = useListingPhonesReveal(id);
  const authUser = useAuthStore((s) => s.user);
  const viewerIsAdmin = authUser?.type === 'Admin';
  const viewerIsOwner = !!authUser?.id && authUser.id === listing.user?.id;
  const plainContactsMode = viewerIsAdmin || viewerIsOwner;

  if (!listing.user) return null;

  const user = listing.user;
  const isBusiness = user.type === 'Business';
  const isClosed = listing.status === 'Closed';
  const showPlatformPartnerLabel = isBusiness && user.isPlatformPartner === true;
  const secondaryStyle = { color: 'rgb(var(--text-secondary-rgb))' as const };
  const phoneDialForMessengers =
    fullPhones?.phone ?? (user.phone && !user.phone.includes('*') ? user.phone : null);
  return (
    <div id="listing-contact-info" className="surface overflow-hidden">
      <h2
        className={`text-xl md:text-2xl font-bold text-primary-900 ${showPlatformPartnerLabel ? 'mb-2' : 'mb-4'}`}
      >
        {t('listingDetail.contactInfo')}
      </h2>
      {showPlatformPartnerLabel && (
        <div className="mb-4">
          <PlatformPartnerBadge />
        </div>
      )}
      <div className="space-y-4 wrap-break-word">
        <SellerPublicProfileSummary
          listing={listing}
          user={user}
          isBusiness={isBusiness}
          isClosed={isClosed}
          locale={locale}
          cities={cities}
          secondaryStyle={secondaryStyle}
          t={t}
        />

        {isClosed ? (
          <ListingSellerContactsWhenClosed user={user} isBusiness={isBusiness} t={t} />
        ) : (
          <ListingSellerContactsWhenOpen
            user={user}
            listing={listing}
            listingId={id}
            isBusiness={isBusiness}
            t={t}
            ensureFull={ensureFull}
            fullPhones={fullPhones}
            plainContactsMode={plainContactsMode}
            contactRevealNonce={contactRevealNonce}
          />
        )}

        <SellerMessengerLinks
          listing={listing}
          listingId={id}
          t={t}
          phoneForDial={phoneDialForMessengers}
        />

        {listing.user && activeListingsCount > 1 && boardSlug && (
          <div className="pt-4 border-t border-primary-500/20">
            <SellerBoardLink
              listing={listing}
              activeListingsCount={activeListingsCount}
              boardSlug={boardSlug}
              t={t}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export function ListingPageSeller(props: ListingPageSellerProps) {
  return <ListingPageSellerInner {...props} />;
}
