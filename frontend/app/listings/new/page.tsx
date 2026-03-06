'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useTranslation } from '@/hooks/useTranslation';

function FormSkeleton() {
  return (
    <div className="card p-4 md:p-6 lg:p-8 animate-pulse min-h-[800px]">
      <div className="mb-6 border-b border-gray-200 pb-4">
        <div className="h-8 bg-gray-200 rounded-sm w-48 mb-4" />
        <div className="flex gap-2">
          <div className="h-16 w-16 bg-gray-200 rounded-lg" />
          <div className="h-16 w-16 bg-gray-200 rounded-lg" />
          <div className="h-16 w-16 bg-gray-200 rounded-lg" />
        </div>
      </div>
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded-sm w-56 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-12 bg-gray-200 rounded-sm" />
          <div className="h-12 bg-gray-200 rounded-sm" />
          <div className="h-12 bg-gray-200 rounded-sm" />
          <div className="h-12 bg-gray-200 rounded-sm" />
        </div>
        <div className="h-8 bg-gray-200 rounded-sm w-48 mt-6 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-12 bg-gray-200 rounded-sm" />
          <div className="h-12 bg-gray-200 rounded-sm" />
        </div>
        <div className="h-8 bg-gray-200 rounded-sm w-40 mt-6 mb-4" />
        <div className="h-32 bg-gray-200 rounded-sm" />
        <div className="h-12 bg-gray-200 rounded-sm w-full mt-6" />
      </div>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="max-w-4xl mx-auto mt-6 md:mt-12">
      <div className="h-10 bg-gray-200 rounded-sm w-64 mb-6 ml-4 md:ml-6 lg:ml-8 animate-pulse" />
      <FormSkeleton />
    </div>
  );
}

const ListingForm = dynamic(
  () => import('@/components/ListingForm').then((mod) => ({ default: mod.ListingForm })),
  {
    ssr: false,
  },
);

export default function NewListingPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isLoading, isAuthorized } = useRequireAuth();

  if (isLoading || !isAuthorized) {
    return <PageSkeleton />;
  }

  return (
    <div className="max-w-4xl mx-auto mt-6 md:mt-12 min-h-[900px]">
      <h1 className="text-3xl md:text-4xl font-extrabold mb-6 pl-4 md:pl-6 lg:pl-8 text-primary-900">
        {t('header.createListing')}
      </h1>
      <ListingForm mode="create" onSuccess={() => router.push('/my-listings')} />
    </div>
  );
}
