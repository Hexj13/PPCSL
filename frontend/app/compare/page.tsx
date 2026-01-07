'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';

import { Breadcrumbs } from '@/components/Breadcrumbs';
import { useTranslation } from '@/hooks/useTranslation';
import { listingsApi, Listing } from '@/lib/api';
import { getColorLabel } from '@/lib/form-options';
import { loadSiteConfigSync } from '@/lib/site-config';
import { useAuthStore, useComparisonStore } from '@/lib/store';
import {
  formatPrice,
  formatMileage,
  formatEngineVolume,
  formatTransmission,
  formatDriveType,
  formatBodyType,
  formatRegistrationType,
  horsepowerToKw,
} from '@/lib/utils';

export default function ComparePage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, isInitialized } = useAuthStore();
  const { comparisons, remove, rehydrate } = useComparisonStore();
  const [listings, setListings] = useState<Listing[]>([]);
  const prevComparisonsRef = useRef<string[]>([]);
  const listingsLengthRef = useRef(0);
  const hasRehydratedRef = useRef(false);

  const country = process.env.NEXT_PUBLIC_COUNTRY || 'mk';
  const siteConfig = loadSiteConfigSync(country);

  useEffect(() => {
    if (isInitialized && !user) {
      router.push('/login');
      return;
    }
  }, [user, isInitialized, router]);

  useEffect(() => {
    const rehydrateAndFetch = async () => {
      if (!hasRehydratedRef.current) {
        hasRehydratedRef.current = true;
        await rehydrate();
      }

      let currentComparisons = comparisons;

      if (currentComparisons.length === 0 && typeof window !== 'undefined') {
        const backup = localStorage.getItem('comparison-storage-backup');
        if (backup) {
          try {
            const parsed = JSON.parse(backup);
            if (parsed.state?.comparisons?.length > 0) {
              currentComparisons = parsed.state.comparisons;
              await rehydrate();
            }
          } catch {
            // Ignore errors
          }
        }
      }

      if (currentComparisons.length === 0) {
        setListings([]);
        prevComparisonsRef.current = [];
        listingsLengthRef.current = 0;
        return;
      }

      const prevIds = new Set(prevComparisonsRef.current);
      const currentIds = new Set(currentComparisons);
      const newIds = currentComparisons.filter((id) => !prevIds.has(id));

      if (newIds.length === 0 && listingsLengthRef.current > 0) {
        setListings((prev) => {
          const filtered = prev.filter((listing) => currentIds.has(listing.id));
          listingsLengthRef.current = filtered.length;
          return filtered;
        });
        prevComparisonsRef.current = comparisons;
        return;
      }

      try {
        const idsToFetch = newIds.length > 0 ? newIds : currentComparisons;
        const promises = idsToFetch.map((id) => listingsApi.getOne(id).catch(() => null));
        const results = await Promise.all(promises);
        const validListings = results.filter((r) => r !== null).map((r) => r!.data);

        if (newIds.length > 0) {
          setListings((prev) => {
            const existingIds = new Set(prev.map((l) => l.id));
            const newListings = validListings.filter((l) => !existingIds.has(l.id));
            const updated = [...prev.filter((l) => currentIds.has(l.id)), ...newListings];
            listingsLengthRef.current = updated.length;
            return updated;
          });
        } else {
          setListings(validListings);
          listingsLengthRef.current = validListings.length;
        }
        prevComparisonsRef.current = currentComparisons;
      } catch (error) {
        console.error('Error fetching listings:', error);
        toast.error(t('compare.loadError'));
      }
    };

    rehydrateAndFetch();
  }, [comparisons, rehydrate, t]);

  if (!isInitialized || !user) {
    return null;
  }

  const handleRemove = (id: string) => {
    setListings((prev) => prev.filter((listing) => listing.id !== id));
    remove(id);
    toast.success(t('compare.removedFromComparison'));
  };

  const getValue = (value: string | number | undefined | null): string => {
    if (value === undefined || value === null || value === '') {
      return t('compare.notAvailable');
    }
    return String(value);
  };

  if (listings.length === 0) {
    return (
      <div className="max-w-7xl mx-auto">
        <Breadcrumbs
          items={[{ label: t('breadcrumbs.home'), href: '/' }, { label: t('compare.title') }]}
          className="mb-6"
        />
        <h1 className="text-3xl md:text-4xl font-extrabold mb-6 bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent">
          {t('compare.title')}
        </h1>
        <div className="surface text-center py-12">
          <svg
            className="w-24 h-24 mx-auto text-gray-400 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
            />
          </svg>
          <h2 className="text-2xl font-bold text-primary-400 mb-2">{t('compare.noVehicles')}</h2>
          <p className="mb-6" style={{ color: 'rgb(243, 243, 243)' }}>
            {t('compare.addVehiclesHint')}
          </p>
          <div className="flex justify-center">
            <Link href="/" className="btn-primary">
              {t('compare.browseListings')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <Breadcrumbs
        items={[{ label: t('breadcrumbs.home'), href: '/' }, { label: t('compare.title') }]}
        className="mb-6"
      />
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent">
          {t('compare.title')}
        </h1>
        <button
          onClick={() => {
            comparisons.forEach((id) => remove(id));
            if (typeof window !== 'undefined') {
              localStorage.removeItem('comparison-storage-backup');
            }
            toast.success(t('compare.allRemoved'));
          }}
          className="h-[52px] px-6 py-3 rounded-lg font-semibold transition-all duration-200 btn-secondary"
        >
          {t('compare.clearAll')}
        </button>
      </div>

      <div className="surface overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="border-b border-primary-500/20">
              <th className="text-left py-4 px-4 text-primary-400 font-semibold">
                {t('compare.parameter')}
              </th>
              {listings.map((listing) => (
                <th
                  key={listing.id}
                  className="text-center py-4 px-4 text-primary-400 font-semibold min-w-[200px]"
                >
                  <div className="flex justify-center items-center">
                    <button
                      onClick={() => handleRemove(listing.id)}
                      className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                      title={t('common.removeFromComparison')}
                    >
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-primary-500/10">
              <td className="py-4 px-4 text-primary-400 font-semibold">{t('compare.photo')}</td>
              {listings.map((listing) => {
                const imageUrl = listing.images?.[0] || '/placeholder-car.jpg';
                const isPlaceholder = imageUrl === '/placeholder-car.jpg';
                const isExternal =
                  imageUrl.startsWith('http://') || imageUrl.startsWith('https://');

                return (
                  <td key={listing.id} className="py-4 px-4 text-center">
                    <div className="flex justify-center">
                      <Link
                        href={`/listings/${listing.id}`}
                        className="relative w-24 h-16 bg-bg-darker rounded-lg overflow-hidden block"
                      >
                        {isPlaceholder ? (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <svg
                              className="w-8 h-8"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"
                              />
                            </svg>
                          </div>
                        ) : isExternal ? (
                          <img
                            src={imageUrl}
                            alt={listing.title}
                            className="w-full h-full object-cover"
                            crossOrigin="anonymous"
                          />
                        ) : (
                          <Image
                            src={imageUrl}
                            alt={listing.title}
                            fill
                            sizes="96px"
                            className="object-cover"
                            unoptimized={process.env.NODE_ENV === 'development'}
                          />
                        )}
                      </Link>
                    </div>
                  </td>
                );
              })}
            </tr>
            <tr className="border-b border-primary-500/10">
              <td className="py-4 px-4 text-primary-400 font-semibold">
                {t('compare.titleColumn')}
              </td>
              {listings.map((listing) => (
                <td key={listing.id} className="py-4 px-4 text-center">
                  <Link
                    href={`/listings/${listing.id}`}
                    className="text-white hover:text-primary-400 transition-colors underline font-medium inline-flex items-center gap-1.5"
                  >
                    {getValue(listing.title)}
                    <svg
                      className="w-5 h-5 opacity-60"
                      style={{ verticalAlign: 'middle', marginBottom: '2px' }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </Link>
                </td>
              ))}
            </tr>
            <tr className="border-b border-primary-500/10">
              <td className="py-4 px-4 text-primary-400 font-semibold">{t('compare.brand')}</td>
              {listings.map((listing) => (
                <td
                  key={listing.id}
                  className="py-4 px-4 text-center"
                  style={{ color: 'rgb(243, 243, 243)' }}
                >
                  {getValue(listing.vehicle?.brand?.name)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-primary-500/10">
              <td className="py-4 px-4 text-primary-400 font-semibold">{t('compare.model')}</td>
              {listings.map((listing) => (
                <td
                  key={listing.id}
                  className="py-4 px-4 text-center"
                  style={{ color: 'rgb(243, 243, 243)' }}
                >
                  {getValue(listing.vehicle?.model?.name)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-primary-500/10">
              <td className="py-4 px-4 text-primary-400 font-semibold">{t('compare.year')}</td>
              {listings.map((listing) => (
                <td
                  key={listing.id}
                  className="py-4 px-4 text-center"
                  style={{ color: 'rgb(243, 243, 243)' }}
                >
                  {getValue(listing.vehicle?.year)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-primary-500/10">
              <td className="py-4 px-4 text-primary-400 font-semibold">{t('compare.mileage')}</td>
              {listings.map((listing) => (
                <td
                  key={listing.id}
                  className="py-4 px-4 text-center"
                  style={{ color: 'rgb(243, 243, 243)' }}
                >
                  {listing.vehicle?.mileage_km
                    ? `${formatMileage(listing.vehicle.mileage_km)} ${t('listings.km')}`
                    : t('compare.notAvailable')}
                </td>
              ))}
            </tr>
            <tr className="border-b border-primary-500/10">
              <td className="py-4 px-4 text-primary-400 font-semibold">{t('compare.engine')}</td>
              {listings.map((listing) => (
                <td
                  key={listing.id}
                  className="py-4 px-4 text-center"
                  style={{ color: 'rgb(243, 243, 243)' }}
                >
                  {listing.vehicle?.engine_displ_l
                    ? `${formatEngineVolume(listing.vehicle.engine_displ_l)} ${t('listings.liters')}`
                    : t('compare.notAvailable')}
                </td>
              ))}
            </tr>
            <tr className="border-b border-primary-500/10">
              <td className="py-4 px-4 text-primary-400 font-semibold">
                {t('listingDetail.power')}
              </td>
              {listings.map((listing) => (
                <td
                  key={listing.id}
                  className="py-4 px-4 text-center"
                  style={{ color: 'rgb(243, 243, 243)' }}
                >
                  {listing.horsepower !== undefined && listing.horsepower !== null
                    ? `${listing.horsepower} ${t('listingDetail.horsepowerUnit')} / ${
                        listing.power_kw || horsepowerToKw(listing.horsepower)
                      } ${t('listingDetail.kwUnit')}`
                    : t('compare.notAvailable')}
                </td>
              ))}
            </tr>
            <tr className="border-b border-primary-500/10">
              <td className="py-4 px-4 text-primary-400 font-semibold">{t('compare.fuel')}</td>
              {listings.map((listing) => (
                <td
                  key={listing.id}
                  className="py-4 px-4 text-center"
                  style={{ color: 'rgb(243, 243, 243)' }}
                >
                  {getValue(listing.vehicle?.fuel)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-primary-500/10">
              <td className="py-4 px-4 text-primary-400 font-semibold">
                {t('compare.transmission')}
              </td>
              {listings.map((listing) => (
                <td
                  key={listing.id}
                  className="py-4 px-4 text-center"
                  style={{ color: 'rgb(243, 243, 243)' }}
                >
                  {listing.vehicle?.transmission
                    ? formatTransmission(listing.vehicle.transmission)
                    : t('compare.notAvailable')}
                </td>
              ))}
            </tr>
            <tr className="border-b border-primary-500/10">
              <td className="py-4 px-4 text-primary-400 font-semibold">{t('compare.driveType')}</td>
              {listings.map((listing) => (
                <td
                  key={listing.id}
                  className="py-4 px-4 text-center"
                  style={{ color: 'rgb(243, 243, 243)' }}
                >
                  {listing.vehicle?.drive_type
                    ? formatDriveType(listing.vehicle.drive_type)
                    : t('compare.notAvailable')}
                </td>
              ))}
            </tr>
            <tr className="border-b border-primary-500/10">
              <td className="py-4 px-4 text-primary-400 font-semibold">{t('compare.bodyType')}</td>
              {listings.map((listing) => (
                <td
                  key={listing.id}
                  className="py-4 px-4 text-center"
                  style={{ color: 'rgb(243, 243, 243)' }}
                >
                  {listing.vehicle?.body_type
                    ? formatBodyType(listing.vehicle.body_type)
                    : t('compare.notAvailable')}
                </td>
              ))}
            </tr>
            <tr className="border-b border-primary-500/10">
              <td className="py-4 px-4 text-primary-400 font-semibold">{t('compare.color')}</td>
              {listings.map((listing) => (
                <td
                  key={listing.id}
                  className="py-4 px-4 text-center"
                  style={{ color: 'rgb(243, 243, 243)' }}
                >
                  {listing.vehicle?.color
                    ? getColorLabel(listing.vehicle.color, t)
                    : t('compare.notAvailable')}
                </td>
              ))}
            </tr>
            <tr className="border-b border-primary-500/10">
              <td className="py-4 px-4 text-primary-400 font-semibold">{t('compare.doors')}</td>
              {listings.map((listing) => (
                <td
                  key={listing.id}
                  className="py-4 px-4 text-center"
                  style={{ color: 'rgb(243, 243, 243)' }}
                >
                  {getValue(listing.vehicle?.doors)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-primary-500/10">
              <td className="py-4 px-4 text-primary-400 font-semibold">{t('compare.condition')}</td>
              {listings.map((listing) => (
                <td
                  key={listing.id}
                  className="py-4 px-4 text-center"
                  style={{ color: 'rgb(243, 243, 243)' }}
                >
                  {listing.condition
                    ? t(`vehicleOptions.condition.${listing.condition}`)
                    : t('compare.notAvailable')}
                </td>
              ))}
            </tr>
            <tr className="border-b border-primary-500/10">
              <td className="py-4 px-4 text-primary-400 font-semibold">
                {t('compare.registrationType')}
              </td>
              {listings.map((listing) => (
                <td
                  key={listing.id}
                  className="py-4 px-4 text-center"
                  style={{ color: 'rgb(243, 243, 243)' }}
                >
                  {listing.registration_type
                    ? formatRegistrationType(listing.registration_type)
                    : t('compare.notAvailable')}
                </td>
              ))}
            </tr>
            <tr className="border-b border-primary-500/10">
              <td className="py-4 px-4 text-primary-400 font-semibold">
                {t('compare.registration')}
              </td>
              {listings.map((listing) => (
                <td
                  key={listing.id}
                  className="py-4 px-4 text-center"
                  style={{ color: 'rgb(243, 243, 243)' }}
                >
                  {listing.is_registered !== undefined
                    ? listing.is_registered
                      ? t('compare.registered')
                      : t('compare.notRegistered')
                    : t('compare.notAvailable')}
                </td>
              ))}
            </tr>
            <tr className="border-b border-primary-500/10">
              <td className="py-4 px-4 text-primary-400 font-semibold">{t('compare.price')}</td>
              {listings.map((listing) => (
                <td
                  key={listing.id}
                  className="py-4 px-4 text-center"
                  style={{ color: 'rgb(243, 243, 243)' }}
                >
                  {listing.status === 'Closed' || listing.price === undefined
                    ? t('compare.notAvailable')
                    : `${formatPrice(listing.price, listing.currency)} ${listing.currency || siteConfig.currency}`}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
