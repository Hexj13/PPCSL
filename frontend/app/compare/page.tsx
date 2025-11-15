'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';

import { Breadcrumbs } from '@/components/Breadcrumbs';
import { listingsApi, Listing } from '@/lib/api';
import { useComparisonStore } from '@/lib/store';
import {
  formatPrice,
  formatMileage,
  formatEngineVolume,
  formatTransmission,
  formatDriveType,
  formatBodyType,
  formatCondition,
  formatRegistrationType,
} from '@/lib/utils';

export default function ComparePage() {
  const { comparisons, remove, rehydrate } = useComparisonStore();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const prevComparisonsRef = useRef<string[]>([]);
  const listingsLengthRef = useRef(0);
  const hasRehydratedRef = useRef(false);

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
        setLoading(false);
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

      if (listingsLengthRef.current === 0) {
        setLoading(true);
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
        toast.error('Грешка при вчитување на објави');
      } finally {
        setLoading(false);
      }
    };

    rehydrateAndFetch();
  }, [comparisons, rehydrate]);

  const handleRemove = (id: string) => {
    setListings((prev) => prev.filter((listing) => listing.id !== id));
    remove(id);
    toast.success('Отстрането од споредба');
  };

  const getValue = (value: string | number | undefined | null): string => {
    if (value === undefined || value === null || value === '') {
      return 'N/A';
    }
    return String(value);
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto">
        <Breadcrumbs
          items={[{ label: 'Почетна', href: '/' }, { label: 'Споредба' }]}
          className="mb-6"
        />
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-300">Вчитување...</p>
        </div>
      </div>
    );
  }

  if (comparisons.length === 0) {
    return (
      <div className="max-w-7xl mx-auto">
        <Breadcrumbs
          items={[{ label: 'Почетна', href: '/' }, { label: 'Споредба' }]}
          className="mb-6"
        />
        <h1 className="text-3xl md:text-4xl font-extrabold mb-6 bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent">
          Споредба на возила
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
          <h2 className="text-2xl font-bold text-primary-400 mb-2">Нема возила за споредба</h2>
          <p className="text-gray-300 mb-6">
            Додадете возила од страниците на објави за да ги споредите
          </p>
          <div className="flex justify-center">
            <Link href="/" className="btn-primary">
              Прегледај објави
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <Breadcrumbs
        items={[{ label: 'Почетна', href: '/' }, { label: 'Споредба' }]}
        className="mb-6"
      />
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent">
          Споредба на возила
        </h1>
        <button
          onClick={() => {
            comparisons.forEach((id) => remove(id));
            if (typeof window !== 'undefined') {
              localStorage.removeItem('comparison-storage-backup');
            }
            toast.success('Сите возила се отстранети од споредба');
          }}
          className="h-[52px] px-6 py-3 rounded-lg font-semibold transition-all duration-200 btn-secondary"
        >
          Исчисти
        </button>
      </div>

      <div className="surface overflow-x-auto">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="border-b border-primary-500/20">
              <th className="text-left py-4 px-4 text-primary-400 font-semibold">Параметар</th>
              {listings.map((listing) => (
                <th
                  key={listing.id}
                  className="text-center py-4 px-4 text-primary-400 font-semibold min-w-[200px]"
                >
                  <div className="flex justify-center items-center">
                    <button
                      onClick={() => handleRemove(listing.id)}
                      className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                      title="Отстрани од споредба"
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
              <td className="py-4 px-4 text-primary-400 font-semibold">Наслов</td>
              {listings.map((listing) => (
                <td key={listing.id} className="py-4 px-4 text-center">
                  <Link
                    href={`/listings/${listing.id}`}
                    className="text-white hover:text-primary-400 transition-colors underline font-medium"
                  >
                    {getValue(listing.title)}
                  </Link>
                </td>
              ))}
            </tr>
            <tr className="border-b border-primary-500/10">
              <td className="py-4 px-4 text-primary-400 font-semibold">Марка</td>
              {listings.map((listing) => (
                <td key={listing.id} className="py-4 px-4 text-center text-gray-300">
                  {getValue(listing.vehicle?.brand?.name)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-primary-500/10">
              <td className="py-4 px-4 text-primary-400 font-semibold">Модел</td>
              {listings.map((listing) => (
                <td key={listing.id} className="py-4 px-4 text-center text-gray-300">
                  {getValue(listing.vehicle?.model?.name)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-primary-500/10">
              <td className="py-4 px-4 text-primary-400 font-semibold">Година</td>
              {listings.map((listing) => (
                <td key={listing.id} className="py-4 px-4 text-center text-gray-300">
                  {getValue(listing.vehicle?.year)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-primary-500/10">
              <td className="py-4 px-4 text-primary-400 font-semibold">Поминување</td>
              {listings.map((listing) => (
                <td key={listing.id} className="py-4 px-4 text-center text-gray-300">
                  {listing.vehicle?.mileage_km
                    ? `${formatMileage(listing.vehicle.mileage_km)} км`
                    : 'N/A'}
                </td>
              ))}
            </tr>
            <tr className="border-b border-primary-500/10">
              <td className="py-4 px-4 text-primary-400 font-semibold">Мотор</td>
              {listings.map((listing) => (
                <td key={listing.id} className="py-4 px-4 text-center text-gray-300">
                  {listing.vehicle?.engine_displ_l
                    ? `${formatEngineVolume(listing.vehicle.engine_displ_l)} л`
                    : 'N/A'}
                </td>
              ))}
            </tr>
            <tr className="border-b border-primary-500/10">
              <td className="py-4 px-4 text-primary-400 font-semibold">Коњски сили</td>
              {listings.map((listing) => (
                <td key={listing.id} className="py-4 px-4 text-center text-gray-300">
                  {getValue(listing.horsepower)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-primary-500/10">
              <td className="py-4 px-4 text-primary-400 font-semibold">Гориво</td>
              {listings.map((listing) => (
                <td key={listing.id} className="py-4 px-4 text-center text-gray-300">
                  {getValue(listing.vehicle?.fuel)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-primary-500/10">
              <td className="py-4 px-4 text-primary-400 font-semibold">Пренос</td>
              {listings.map((listing) => (
                <td key={listing.id} className="py-4 px-4 text-center text-gray-300">
                  {listing.vehicle?.transmission
                    ? formatTransmission(listing.vehicle.transmission)
                    : 'N/A'}
                </td>
              ))}
            </tr>
            <tr className="border-b border-primary-500/10">
              <td className="py-4 px-4 text-primary-400 font-semibold">Тип на погон</td>
              {listings.map((listing) => (
                <td key={listing.id} className="py-4 px-4 text-center text-gray-300">
                  {listing.vehicle?.drive_type
                    ? formatDriveType(listing.vehicle.drive_type)
                    : 'N/A'}
                </td>
              ))}
            </tr>
            <tr className="border-b border-primary-500/10">
              <td className="py-4 px-4 text-primary-400 font-semibold">Тип на каросерија</td>
              {listings.map((listing) => (
                <td key={listing.id} className="py-4 px-4 text-center text-gray-300">
                  {listing.vehicle?.body_type ? formatBodyType(listing.vehicle.body_type) : 'N/A'}
                </td>
              ))}
            </tr>
            <tr className="border-b border-primary-500/10">
              <td className="py-4 px-4 text-primary-400 font-semibold">Боја</td>
              {listings.map((listing) => (
                <td key={listing.id} className="py-4 px-4 text-center text-gray-300">
                  {getValue(listing.vehicle?.color)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-primary-500/10">
              <td className="py-4 px-4 text-primary-400 font-semibold">Врати</td>
              {listings.map((listing) => (
                <td key={listing.id} className="py-4 px-4 text-center text-gray-300">
                  {getValue(listing.vehicle?.doors)}
                </td>
              ))}
            </tr>
            <tr className="border-b border-primary-500/10">
              <td className="py-4 px-4 text-primary-400 font-semibold">Состојба</td>
              {listings.map((listing) => (
                <td key={listing.id} className="py-4 px-4 text-center text-gray-300">
                  {listing.condition ? formatCondition(listing.condition) : 'N/A'}
                </td>
              ))}
            </tr>
            <tr className="border-b border-primary-500/10">
              <td className="py-4 px-4 text-primary-400 font-semibold">Тип на регистрација</td>
              {listings.map((listing) => (
                <td key={listing.id} className="py-4 px-4 text-center text-gray-300">
                  {listing.registration_type
                    ? formatRegistrationType(listing.registration_type)
                    : 'N/A'}
                </td>
              ))}
            </tr>
            <tr className="border-b border-primary-500/10">
              <td className="py-4 px-4 text-primary-400 font-semibold">Регистрација</td>
              {listings.map((listing) => (
                <td key={listing.id} className="py-4 px-4 text-center text-gray-300">
                  {listing.is_registered !== undefined
                    ? listing.is_registered
                      ? 'Зарегистрирано'
                      : 'Не е зарегистрирано'
                    : 'N/A'}
                </td>
              ))}
            </tr>
            <tr className="border-b border-primary-500/10">
              <td className="py-4 px-4 text-primary-400 font-semibold">Цена</td>
              {listings.map((listing) => (
                <td key={listing.id} className="py-4 px-4 text-center text-gray-300">
                  {listing.status === 'Closed' || listing.price === undefined
                    ? 'N/A'
                    : `${formatPrice(listing.price, listing.currency)} ${listing.currency || 'MKD'}`}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
