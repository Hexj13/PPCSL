'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';

import { ListingForm } from '@/components/ListingForm';
import { api, listingsApi, Listing } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

export default function EditListingPage() {
  const params = useParams();
  const router = useRouter();
  const listingId = params.id as string;
  const { user, isInitialized } = useAuthStore();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loadingListing, setLoadingListing] = useState(true);
  const [formKey, setFormKey] = useState(0);

  const fetchListing = async (forceRefresh = false) => {
    if (!user) return;

    try {
      const shouldRefresh = sessionStorage.getItem(`refreshListing_${listingId}`) === 'true';
      const needsRefresh = forceRefresh || shouldRefresh;
      
      const res = needsRefresh
        ? await api.get<Listing>(`/api/listings/${listingId}`, { params: { _t: Date.now() } })
        : await listingsApi.getOne(listingId);
      const listingData = res.data;

      if (listingData.user?.id !== user.id) {
        toast.error('Немате пристап до оваа објава');
        router.push('/my-listings');
        return;
      }

      if (listingData.status === 'Closed') {
        toast.error('Не можете да уредувате затворена објава');
        router.push('/my-listings');
        return;
      }

      setListing(listingData);
      setFormKey(prev => prev + 1);
      setLoadingListing(false);
      if (needsRefresh) {
        sessionStorage.removeItem(`refreshListing_${listingId}`);
      }
    } catch {
      toast.error('Грешка при вчитување на објавата');
      router.push('/my-listings');
      const shouldRefresh = sessionStorage.getItem(`refreshListing_${listingId}`) === 'true';
      if (shouldRefresh) {
        sessionStorage.removeItem(`refreshListing_${listingId}`);
      }
    } finally {
      setLoadingListing(false);
    }
  };

  useEffect(() => {
    if (!isInitialized && !user) {
      return;
    }

    if (isInitialized && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      const shouldRefresh = sessionStorage.getItem(`refreshListing_${listingId}`) === 'true';
      setListing(null);
      setLoadingListing(true);
      setFormKey(0);
      fetchListing(shouldRefresh);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isInitialized, router, listingId]);


  if (!isInitialized && !user) {
    return null;
  }

  if (isInitialized && !user) {
    return null;
  }

  if (!user) {
    return null;
  }

  if (loadingListing) {
    return (
      <div className="max-w-4xl mx-auto mt-6 md:mt-12">
        <div className="card p-4 md:p-6 lg:p-8">
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            <p className="mt-4 text-gray-300">Вчитување...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!listing) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto mt-6 md:mt-12">
      <h1 className="text-3xl md:text-4xl font-extrabold mb-6 pl-4 md:pl-6 lg:pl-8 bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent">
        Уреди објава
      </h1>
      <ListingForm
        key={`${listingId}-${formKey}`}
        mode="edit"
        listingId={listingId}
        initialData={listing}
        onSuccess={(updatedListing) => {
          if (updatedListing) {
            setListing(updatedListing);
            setFormKey(prev => prev + 1);
          }
          sessionStorage.setItem('refreshMyListings', 'true');
          sessionStorage.setItem(`refreshListing_${listingId}`, 'true');
          router.push('/my-listings');
        }}
      />
    </div>
  );
}
