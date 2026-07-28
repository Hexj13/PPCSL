'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, type ReactNode } from 'react';

import { useTranslation } from '@/hooks/useTranslation';
import { analytics } from '@/lib/analytics';
import type { Listing, Vehicle } from '@/lib/api';
import { listingsApi } from '@/lib/api';
import { getColorLabel } from '@/lib/options';
import { buildSignInHref } from '@/lib/return-url';
import { useAuthStore } from '@/lib/store';
import { toast } from '@/lib/toast';
import {
  formatEngineVolume,
  formatTransmission,
  formatDriveType,
  formatBodyType,
  formatFuel,
  horsepowerToKw,
  formatMileage,
  formatTireSize,
  getTireModelDisplayLabel,
  getVehicleType,
  isTireListing,
} from '@/lib/utils';
import { CopyIcon, EyeIcon, EyeSlashIcon, HintTooltip } from '@/ui';

const SECONDARY_STYLE = { color: 'rgb(var(--text-secondary-rgb))' as const };
const BTN_CLASS =
  'p-1 text-primary-400 hover-only:hover:text-primary-300 hover-only:hover:bg-primary-500/10 rounded-sm transition-colors shrink-0';

function CharRow({
  label,
  value,
  children,
  hint,
}: {
  label: string;
  value?: ReactNode;
  children?: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div>
      <span className="text-primary-700 font-semibold inline-flex items-center gap-1 flex-wrap">
        <span>{label}</span>
        {hint}
        <span>:</span>
      </span>
      <span className="ml-2" style={SECONDARY_STYLE}>
        {value ?? children}
      </span>
    </div>
  );
}

function BrandModelYearVinSection({
  vehicle,
  listing,
  t,
}: {
  vehicle: Vehicle;
  listing: Listing;
  t: (k: string, p?: Record<string, string | number>) => string;
}) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [cachedFullVin, setCachedFullVin] = useState<string | null>(null);
  const [showFullVin, setShowFullVin] = useState(false);
  const [loading, setLoading] = useState<'reveal' | 'copy' | null>(null);

  useEffect(() => {
    setCachedFullVin(null);
    setShowFullVin(false);
  }, [listing.id]);

  const handleReveal = useCallback(() => {
    if (!user) {
      router.push(buildSignInHref(`/listings/${listing.id}`));
      return;
    }
    if (cachedFullVin) {
      setShowFullVin(true);
      return;
    }
    analytics.vinRevealClick(listing.id);
    setLoading('reveal');
    listingsApi
      .getVin(listing.id, 'reveal')
      .then((res) => {
        setCachedFullVin(res.data.vin);
        setShowFullVin(true);
      })
      .catch((err: { response?: { status?: number; data?: { message?: string } } }) => {
        const msg =
          err?.response?.status === 429
            ? (err?.response?.data?.message?.startsWith('errors.')
                ? t('listingDetail.vinRateLimitExceeded')
                : err?.response?.data?.message) || t('listingDetail.vinRateLimitExceeded')
            : t('listingDetail.vinLoadError');
        toast.error(msg);
      })
      .finally(() => setLoading(null));
  }, [user, listing.id, cachedFullVin, t, router]);

  const handleHide = useCallback(() => {
    setShowFullVin(false);
  }, []);

  const handleCopy = useCallback(() => {
    if (!user) {
      router.push(buildSignInHref(`/listings/${listing.id}`));
      return;
    }
    if (cachedFullVin) {
      analytics.vinCopyClick(listing.id);
      navigator.clipboard.writeText(cachedFullVin).then(
        () => toast.success(t('listingDetail.copied', { label: t('listingDetail.vin') })),
        () => toast.error(t('listingDetail.copyError')),
      );
      return;
    }
    analytics.vinCopyClick(listing.id);
    setLoading('copy');
    listingsApi
      .getVin(listing.id, 'copy')
      .then((res) => {
        setCachedFullVin(res.data.vin);
        navigator.clipboard.writeText(res.data.vin).then(
          () => toast.success(t('listingDetail.copied', { label: t('listingDetail.vin') })),
          () => toast.error(t('listingDetail.copyError')),
        );
      })
      .catch((err: { response?: { status?: number; data?: { message?: string } } }) => {
        const msg =
          err?.response?.status === 429
            ? (err?.response?.data?.message?.startsWith('errors.')
                ? t('listingDetail.vinRateLimitExceeded')
                : err?.response?.data?.message) || t('listingDetail.vinRateLimitExceeded')
            : t('listingDetail.vinLoadError');
        toast.error(msg);
      })
      .finally(() => setLoading(null));
  }, [user, listing.id, cachedFullVin, t, router]);

  const hasAny = vehicle.brand?.name || vehicle.model?.name || vehicle.year || listing.vin;
  if (!hasAny) return null;
  const displayVin = showFullVin && cachedFullVin ? cachedFullVin : (listing.vin ?? '');
  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {vehicle.brand?.name && (
          <CharRow label={t('listingDetail.brand')} value={vehicle.brand.name} />
        )}
        {vehicle.model?.name && (
          <CharRow label={t('listingDetail.model')} value={vehicle.model.name} />
        )}
        {vehicle.year && <CharRow label={t('listingDetail.year')} value={String(vehicle.year)} />}
        {listing.vin && (
          <div className="flex items-center gap-1">
            <span className="text-primary-700 font-semibold">{t('listingDetail.vin')}:</span>
            <span className="ml-2" style={SECONDARY_STYLE}>
              {displayVin}
            </span>
            {showFullVin && cachedFullVin ? (
              <button
                type="button"
                onClick={handleHide}
                className={BTN_CLASS}
                title={t('listingDetail.hideVin')}
                aria-label={t('listingDetail.hideVin')}
              >
                <EyeSlashIcon className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleReveal}
                disabled={!!loading}
                className={BTN_CLASS}
                title={t('listingDetail.revealVin')}
                aria-label={t('listingDetail.revealVin')}
              >
                <EyeIcon className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={handleCopy}
              disabled={!!loading}
              className={BTN_CLASS}
              title={t('listingDetail.copyVin')}
              aria-label={t('listingDetail.copyVin')}
            >
              <CopyIcon className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function EngineSpecsSection({
  vehicle,
  listing,
  vehicleType,
  t,
}: {
  vehicle: Vehicle;
  listing: Listing;
  vehicleType: 'car' | 'truck' | 'moto';
  t: (k: string, p?: Record<string, string | number>) => string;
}) {
  const hasAny =
    vehicle.engine_displ_l ||
    listing.horsepower !== undefined ||
    vehicle.fuel ||
    vehicle.transmission ||
    vehicle.drive_type ||
    vehicle.mileage_km;
  if (!hasAny) return null;
  const powerKw =
    listing.power_kw ?? (listing.horsepower != null ? horsepowerToKw(listing.horsepower) : null);
  return (
    <div className="pt-4 border-t border-primary-500/30">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {vehicle.engine_displ_l && (
          <CharRow
            label={t('listingDetail.engine')}
            value={`${formatEngineVolume(vehicle.engine_displ_l)} ${t('listings.liters')}`}
          />
        )}
        {listing.horsepower !== undefined && listing.horsepower !== null && (
          <CharRow
            label={t('listingDetail.power')}
            value={`${listing.horsepower} ${t('listingDetail.horsepowerUnit')} / ${powerKw} ${t('listingDetail.kwUnit')}`}
          />
        )}
        {vehicle.fuel && (
          <CharRow label={t('listingDetail.fuel')} value={formatFuel(vehicle.fuel, t)} />
        )}
        {vehicle.transmission && (
          <CharRow
            label={t('listingDetail.transmission')}
            value={formatTransmission(vehicle.transmission, t)}
          />
        )}
        {vehicle.drive_type && vehicleType !== 'moto' && (
          <CharRow
            label={t('listingDetail.driveType')}
            value={formatDriveType(vehicle.drive_type, t)}
          />
        )}
        {vehicle.mileage_km != null && (
          <CharRow
            label={t('listingDetail.mileage')}
            value={`${formatMileage(vehicle.mileage_km)} ${t('listings.km')}`}
          />
        )}
      </div>
    </div>
  );
}

function BodyColorDoorsSection({
  vehicle,
  vehicleType,
  t,
}: {
  vehicle: Vehicle;
  vehicleType: 'car' | 'truck' | 'moto';
  t: (k: string, p?: Record<string, string | number>) => string;
}) {
  const hasAny =
    vehicle.body_type ||
    vehicle.color ||
    vehicle.interior_color ||
    (vehicle.doors != null && vehicleType !== 'moto') ||
    vehicle.seats != null;
  if (!hasAny) return null;
  return (
    <div className="pt-4 border-t border-primary-500/30">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {vehicle.body_type && (
          <CharRow
            label={t('listingDetail.bodyType')}
            value={formatBodyType(vehicle.body_type, t)}
          />
        )}
        {vehicle.color && (
          <CharRow label={t('listingDetail.color')} value={getColorLabel(vehicle.color, t)} />
        )}
        {vehicle.interior_color && (
          <CharRow
            label={t('listingDetail.interiorColor')}
            value={getColorLabel(vehicle.interior_color, t)}
          />
        )}
        {vehicle.doors != null && vehicleType !== 'moto' && (
          <CharRow label={t('listingDetail.doors')} value={String(vehicle.doors)} />
        )}
        {vehicle.seats != null && (
          <CharRow label={t('listingDetail.seats')} value={String(vehicle.seats)} />
        )}
      </div>
    </div>
  );
}

interface ListingPageCharacteristicsProps {
  listing: Listing;
}

function ListingPageTireCharacteristics({ listing }: { listing: Listing }) {
  const { t } = useTranslation();
  const tire = listing.tire;
  if (!tire) return null;
  const modelLabel = getTireModelDisplayLabel(tire);
  const yes = t('listingDetail.tireYes');
  return (
    <div className="surface overflow-hidden">
      <h2 className="text-xl md:text-2xl font-bold mb-4 text-primary-900">
        {t('listingDetail.characteristics')}
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-base">
        {tire.brand?.name && <CharRow label={t('listingDetail.brand')} value={tire.brand.name} />}
        {modelLabel && <CharRow label={t('listingDetail.model')} value={modelLabel} />}
        <CharRow
          label={t('listingDetail.tireVehicleType')}
          value={t(`listings.vehicleType.${tire.tire_vehicle_type}`)}
        />
        <CharRow label={t('listingDetail.tireSize')} value={formatTireSize(tire)} />
        <CharRow
          label={t('listingDetail.tireTread')}
          value={t(`searchFilters.tireTreadOption.${tire.season}`)}
        />
        <CharRow
          label={t('listingDetail.tireCondition')}
          value={t(`searchFilters.tireConditionOption.${tire.condition}`)}
        />
        <CharRow label={t('listings.tireForm.quantityLabel')} value={String(tire.quantity)} />
        {tire.load_index && (
          <CharRow
            label={t('listingDetail.tireLoadIndex')}
            value={tire.load_index}
            hint={
              <HintTooltip
                ariaLabel={t('listings.tireForm.loadIndexHintAria')}
                width="w-96"
                contentHtml={t('listings.tireForm.loadIndexHint')}
              />
            }
          />
        )}
        {tire.speed_index && (
          <CharRow
            label={t('listingDetail.tireSpeedIndex')}
            value={tire.speed_index}
            hint={
              <HintTooltip
                ariaLabel={t('listings.tireForm.speedIndexHintAria')}
                width="w-96"
                contentHtml={t('listings.tireForm.speedIndexHint')}
              />
            }
          />
        )}
        {tire.studded === true && <CharRow label={t('listingDetail.tireStudded')} value={yes} />}
        {tire.run_flat === true && <CharRow label={t('listingDetail.tireRunFlat')} value={yes} />}
        {tire.reinforced_xl === true && (
          <CharRow label={t('listingDetail.tireReinforcedXl')} value={yes} />
        )}
        {tire.spare_donut === true && (
          <CharRow label={t('listingDetail.tireSpareDonut')} value={yes} />
        )}
        {tire.tubeless === true && <CharRow label={t('listingDetail.tireTubeless')} value={yes} />}
        {tire.acoustic === true && <CharRow label={t('listingDetail.tireAcoustic')} value={yes} />}
      </div>
    </div>
  );
}

export function ListingPageCharacteristics({ listing }: ListingPageCharacteristicsProps) {
  const { t } = useTranslation();
  if (isTireListing(listing)) {
    return <ListingPageTireCharacteristics listing={listing} />;
  }
  const vehicle = listing.vehicle;
  const vehicleType = getVehicleType(listing);

  if (!vehicle) return null;

  return (
    <div className="surface overflow-hidden">
      <h2 className="text-xl md:text-2xl font-bold mb-4 text-primary-900">
        {t('listingDetail.characteristics')}
      </h2>
      <div className="space-y-4">
        <BrandModelYearVinSection vehicle={vehicle} listing={listing} t={t} />
        <EngineSpecsSection vehicle={vehicle} listing={listing} vehicleType={vehicleType} t={t} />
        <BodyColorDoorsSection vehicle={vehicle} vehicleType={vehicleType} t={t} />
      </div>
    </div>
  );
}
