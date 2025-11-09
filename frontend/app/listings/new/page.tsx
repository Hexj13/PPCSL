'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { useAuthStore } from '@/lib/store';

const ListingForm = dynamic(
  () => import('@/components/ListingForm').then((mod) => ({ default: mod.ListingForm })),
  {
    loading: () => <div className="animate-pulse">Зарежување...</div>,
    ssr: false,
  }
);

export default function NewListingPage() {
  const router = useRouter();
  const { user, isInitialized } = useAuthStore();

  useEffect(() => {
    if (!isInitialized && !user) {
      return;
    }

    if (isInitialized && !user) {
      router.push('/login');
      return;
    }
  }, [user, isInitialized, router]);

  if (!isInitialized && !user) {
    return null;
  }

  if (isInitialized && !user) {
    return null;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto mt-6 md:mt-12">
      <h1 className="text-3xl md:text-4xl font-extrabold mb-6 pl-4 md:pl-6 lg:pl-8 bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent">
        Додади објава
      </h1>
      <ListingForm mode="create" onSuccess={() => router.push('/my-listings')} />
    </div>
  );
}
