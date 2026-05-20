'use client';

import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo } from 'react';

import { AuthTransitionLoader } from '@/components/auth/AuthTransitionLoader';
import { useAuthTransitionLoaderHold } from '@/hooks/useAuthTransitionLoaderHold';
import { useLoadingState } from '@/hooks/useLoadingState';
import { useLocalizedNavigation } from '@/hooks/useLocalizedNavigation';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useTranslation } from '@/hooks/useTranslation';
import { AUTH_TRANSITION_LOADER_MIN_MS } from '@/lib/auth-transition-loader';

const ListingForm = dynamic(
  () => import('@/components/ListingForm').then((mod) => ({ default: mod.ListingForm })),
  {
    ssr: false,
    loading: () => null,
  },
);

function NewListingFormSection() {
  const { push } = useLocalizedNavigation();
  const searchParams = useSearchParams();
  const initialCreateCategory = useMemo((): 'vehicle' | 'tire' | undefined => {
    const c = searchParams.get('category');
    if (c === 'tire') return 'tire';
    if (c === 'vehicle') return 'vehicle';
    return undefined;
  }, [searchParams]);

  return (
    <ListingForm
      mode="create"
      initialCreateCategory={initialCreateCategory}
      onSuccess={() => push('/my-listings')}
    />
  );
}

export default function NewListingPage() {
  const { t } = useTranslation();
  const { isLoading, isAuthorized } = useRequireAuth({ signReturnPath: '/listings/new' });
  const transitionHold = useAuthTransitionLoaderHold();
  const authGateBusy = isLoading || transitionHold;
  const { visible: showAuthLoader } = useLoadingState({
    isLoading: authGateBusy,
    immediate: true,
    minDisplayTime: AUTH_TRANSITION_LOADER_MIN_MS,
    showDelay: 0,
  });

  if (!isAuthorized) {
    if (!showAuthLoader) {
      return null;
    }
    return <AuthTransitionLoader label={t('common.loading')} />;
  }

  if (showAuthLoader) {
    return <AuthTransitionLoader label={t('common.loading')} />;
  }

  return (
    <div
      className="max-w-4xl mx-auto mt-6 md:mt-12 min-h-[900px]"
      data-testid="listing-create-page"
    >
      <h1 className="text-3xl md:text-4xl font-extrabold mb-6 pl-4 md:pl-6 lg:pl-8 text-primary-900">
        {t('header.createListing')}
      </h1>
      <Suspense fallback={null}>
        <NewListingFormSection />
      </Suspense>
    </div>
  );
}
