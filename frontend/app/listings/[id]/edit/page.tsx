'use client';

import dynamic from 'next/dynamic';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useTranslation } from '@/hooks/useTranslation';
import type { Listing } from '@/lib/api';
import { api } from '@/lib/api';
import { toast } from '@/lib/toast';

const ListingForm = dynamic(
  () => import('@/components/ListingForm').then((mod) => ({ default: mod.ListingForm })),
  {
    loading: () => (
      <div className="animate-pulse">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    ),
    ssr: false,
  },
);

export default function EditListingPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const listingId = params.id as string;
  const { user, isLoading, isAuthorized } = useRequireAuth();
  const isAdmin = user?.type === 'Admin';
  const from = searchParams.get('from');
  const redirectTo =
    from === 'my-listings'
      ? '/my-listings'
      : from === 'admin'
        ? '/admin'
        : isAdmin
          ? '/admin'
          : '/my-listings';
  const [listing, setListing] = useState<Listing | null>(null);
  const [loadingListing, setLoadingListing] = useState(true);
  const [formKey, setFormKey] = useState(0);

  const fetchListing = async (forceRefresh = false) => {
    if (!user) return;

    try {
      const shouldRefresh = sessionStorage.getItem(`refreshListing_${listingId}`) === 'true';
      const needsRefresh = forceRefresh || shouldRefresh;

      const params: Record<string, string | number> = { includeFullVin: '1' };
      if (needsRefresh) {
        params._t = Date.now();
      }
      const res = await api.get<Listing>(`/api/listings/${listingId}`, { params });
      const listingData = res.data;

      if (!isAdmin && listingData.user?.id !== user.id) {
        toast.error(t('listings.noAccessToListing'));
        router.push(redirectTo);
        return;
      }

      if (!isAdmin && listingData.status === 'Closed') {
        toast.error(t('listings.cannotEditClosedListing'));
        router.push(redirectTo);
        return;
      }

      setListing(listingData);
      setFormKey((prev) => prev + 1);
      setLoadingListing(false);
      if (needsRefresh) {
        sessionStorage.removeItem(`refreshListing_${listingId}`);
      }
    } catch {
      toast.error(t('listings.loadListingError'));
      router.push(redirectTo);
      const shouldRefresh = sessionStorage.getItem(`refreshListing_${listingId}`) === 'true';
      if (shouldRefresh) {
        sessionStorage.removeItem(`refreshListing_${listingId}`);
      }
    } finally {
      setLoadingListing(false);
    }
  };

  useEffect(() => {
    if (!isAuthorized || !user) {
      return;
    }

    const shouldRefresh = sessionStorage.getItem(`refreshListing_${listingId}`) === 'true';
    setListing(null);
    setLoadingListing(true);
    setFormKey(0);
    void fetchListing(shouldRefresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isAuthorized, listingId]);

  if (isLoading || !isAuthorized) {
    return null;
  }

  if (loadingListing) {
    return (
      <div className="max-w-4xl mx-auto mt-6 md:mt-12">
        <div className="card p-4 md:p-6 lg:p-8">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="mt-4 text-gray-300">{t('common.loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!listing) {
    return null;
  }

  const canChangeVehicleType = isAdmin;

  return (
    <div className="max-w-4xl mx-auto mt-6 md:mt-12">
      <h1 className="text-3xl md:text-4xl font-extrabold mb-6 pl-4 md:pl-6 lg:pl-8 text-primary-900">
        {t('common.editListing')}
      </h1>
      <ListingForm
        key={`${listingId}-${formKey}`}
        mode="edit"
        listingId={listingId}
        initialData={listing}
        canChangeVehicleType={canChangeVehicleType}
        onSuccess={(updatedListing) => {
          if (updatedListing) {
            setListing(updatedListing);
            setFormKey((prev) => prev + 1);
          }
          sessionStorage.setItem('refreshMyListings', 'true');
          sessionStorage.setItem(`refreshListing_${listingId}`, 'true');
          router.push(redirectTo);
        }}
      />
    </div>
  );
}
