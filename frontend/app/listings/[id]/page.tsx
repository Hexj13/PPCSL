'use client';

import DOMPurify from 'dompurify';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';

import { Breadcrumbs } from '@/components/Breadcrumbs';
import {
  BreadcrumbsSkeleton,
  MainImageSkeleton,
  ThumbnailsSkeleton,
  PriceSkeleton,
  FavoriteButtonSkeleton,
  TitleSkeleton,
  BadgesSkeleton,
} from '@/components/ListingPageSkeleton';
import { StructuredData } from '@/components/StructuredData';
import { UserListingsModal } from '@/components/UserListingsModal';
import { analytics } from '@/lib/analytics';
import { api, listingsApi, Listing, favoritesApi } from '@/lib/api';
import { useAuthStore, useFavoritesStore, useComparisonStore } from '@/lib/store';
import {
  formatPrice,
  formatDate,
  formatMileage,
  formatEngineVolume,
  formatTransmission,
  formatDriveType,
  formatBodyType,
  formatCondition,
  formatRegistrationType,
  getOptimizedImageUrl,
  getCityNameMk,
  getTelegramUrl,
  getWhatsAppUrl,
  getViberUrl,
} from '@/lib/utils';

export default function ListingPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { user } = useAuthStore();
  const { add: addFavorite, remove: removeFavorite, check } = useFavoritesStore();
  const {
    add: addComparison,
    remove: removeComparison,
    check: checkComparison,
    count: comparisonCount,
  } = useComparisonStore();
  const [listing, setListing] = useState<Listing | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isInComparison, setIsInComparison] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const showLoadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasLoadedRef = useRef(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [modalImageIndex, setModalImageIndex] = useState(0);
  const [isUserListingsModalOpen, setIsUserListingsModalOpen] = useState(false);
  const [previousListings, setPreviousListings] = useState<Listing[]>([]);
  const [loadingPrevious, setLoadingPrevious] = useState(false);
  const [showHistoryHint, setShowHistoryHint] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const preloadedImagesRef = useRef<Set<string>>(new Set());

  const fetchListingData = useCallback(
    (forceRefresh = false) => {
      const currentId = id;

      // Check if we should refresh before clearing state
      const shouldRefresh = sessionStorage.getItem(`refreshListing_${currentId}`) === 'true';
      const needsRefresh = forceRefresh || shouldRefresh;

      setImageErrors(new Set());
      setCurrentImageIndex(0);
      setListing(null);
      setPreviousListings([]);
      setLoadingPrevious(false);
      setShowSkeleton(false);

      showLoadingTimeoutRef.current = setTimeout(() => {
        if (hasLoadedRef.current && currentId === id) {
          setShowSkeleton(true);
        }
      }, 500);

      const listingPromise = needsRefresh
        ? api.get<Listing>(`/api/listings/${currentId}`, {
            params: { _t: Date.now() },
            headers: { 'X-Skip-Error-Handling': 'true' },
          })
        : listingsApi.getOne(currentId);

      const favoritePromise = user
        ? favoritesApi
            .check(currentId)
            .then((res) => res.data.isFavorite)
            .catch(() => check(currentId))
        : Promise.resolve(check(currentId));

      const comparisonValue = checkComparison(currentId);

      Promise.all([listingPromise, favoritePromise])
        .then(([listingRes, favoriteValue]) => {
          // Check if component is still mounted and id hasn't changed
          if (currentId !== id) {
            return;
          }

          if (showLoadingTimeoutRef.current) {
            clearTimeout(showLoadingTimeoutRef.current);
            showLoadingTimeoutRef.current = null;
          }

          if (!listingRes?.data) {
            console.error('No listing data received');
            throw new Error('No listing data received');
          }

          const hasVin = listingRes.data.vin;
          setListing(listingRes.data);
          setIsFavorite(favoriteValue);
          setIsInComparison(comparisonValue);
          setShowSkeleton(false);

          analytics.viewItem(currentId, {
            title: listingRes.data.title,
            price: listingRes.data.price,
            brand: listingRes.data.vehicle?.brand?.name,
            model: listingRes.data.vehicle?.model?.name,
          });

          if (hasVin) {
            setLoadingPrevious(true);
          }

          if (hasVin && listingRes.data.vin) {
            listingsApi
              .getByVin(listingRes.data.vin, currentId)
              .then((vinRes) => {
                if (hasLoadedRef.current && currentId === id) {
                  setPreviousListings(vinRes.data);
                }
              })
              .catch(() => {
                if (hasLoadedRef.current && currentId === id) {
                  setPreviousListings([]);
                }
              })
              .finally(() => {
                if (hasLoadedRef.current && currentId === id) {
                  setLoadingPrevious(false);
                }
              });
          }

          if (needsRefresh) {
            sessionStorage.removeItem(`refreshListing_${currentId}`);
          }
        })
        .catch((error) => {
          console.error('Error loading listing:', error);

          // Check if component is still mounted and id hasn't changed
          if (currentId !== id) {
            return;
          }

          if (showLoadingTimeoutRef.current) {
            clearTimeout(showLoadingTimeoutRef.current);
            showLoadingTimeoutRef.current = null;
          }

          // If refresh failed, try without refresh flag
          if (needsRefresh && !forceRefresh && error?.code !== 'ECONNABORTED') {
            // Refresh failed, trying without refresh flag
            sessionStorage.removeItem(`refreshListing_${currentId}`);
            // Use setTimeout to avoid infinite loop
            setTimeout(() => {
              if (currentId === id) {
                fetchListingData(false);
              }
            }, 500);
            return;
          }

          const favoriteValue = check(currentId);
          const comparisonValue = checkComparison(currentId);
          setListing(null);
          setIsFavorite(favoriteValue);
          setIsInComparison(comparisonValue);
          setShowSkeleton(false);

          if (needsRefresh) {
            sessionStorage.removeItem(`refreshListing_${currentId}`);
          }
        });
    },
    [id, user, check, checkComparison]
  );

  useEffect(() => {
    const shouldRefresh = sessionStorage.getItem(`refreshListing_${id}`) === 'true';
    hasLoadedRef.current = true;
    fetchListingData(shouldRefresh);

    return () => {
      hasLoadedRef.current = false;
      if (showLoadingTimeoutRef.current) {
        clearTimeout(showLoadingTimeoutRef.current);
        showLoadingTimeoutRef.current = null;
      }
    };
  }, [fetchListingData, id]);

  useEffect(() => {
    const checkAndRefresh = () => {
      const shouldRefresh = sessionStorage.getItem(`refreshListing_${id}`) === 'true';
      if (shouldRefresh && hasLoadedRef.current) {
        fetchListingData(true);
      }
    };

    // Don't call immediately on mount - let the first useEffect handle initial load
    // Only set up listeners for visibility/focus changes

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkAndRefresh();
      }
    };

    const handleFocus = () => {
      checkAndRefresh();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [id, fetchListingData]);

  const handleToggleFavorite = async () => {
    if (!user) {
      if (typeof window !== 'undefined') {
        const pendingFavorites = JSON.parse(localStorage.getItem('pendingFavorites') || '[]');
        if (!pendingFavorites.includes(id)) {
          pendingFavorites.push(id);
          localStorage.setItem('pendingFavorites', JSON.stringify(pendingFavorites));
        }
        const returnUrl = `/listings/${id}`;
        localStorage.setItem('returnUrl', returnUrl);
      }
      router.push('/login');
      return;
    }

    if (isFavorite) {
      try {
        await favoritesApi.remove(id);
        removeFavorite(id);
        setIsFavorite(false);
        analytics.removeFromWishlist(id);
        toast.success('Отстрането од омилени');
      } catch {
        removeFavorite(id);
        setIsFavorite(false);
      }
      return;
    }

    if (listing && user && listing.user && user.id === listing.user.id) {
      return;
    }

    try {
      await favoritesApi.add(id);
      addFavorite(id);
      setIsFavorite(true);
      analytics.addToWishlist(id, {
        title: listing?.title,
        price: listing?.price,
      });
      toast.success('Додадено во омилени');
    } catch {
      addFavorite(id);
      setIsFavorite(true);
    }
  };

  const handleToggleComparison = () => {
    if (!user) {
      if (typeof window !== 'undefined') {
        const pendingComparisons = JSON.parse(localStorage.getItem('pendingComparisons') || '[]');
        if (!pendingComparisons.includes(id)) {
          pendingComparisons.push(id);
          localStorage.setItem('pendingComparisons', JSON.stringify(pendingComparisons));
        }
        const returnUrl = `/listings/${id}`;
        localStorage.setItem('returnUrl', returnUrl);
      }
      router.push('/login');
      return;
    }

    if (isInComparison) {
      removeComparison(id);
      setIsInComparison(false);
      analytics.removeFromComparison(id);
      toast.success('Отстрането од споредба');
      return;
    }

    if (comparisonCount() >= 3) {
      toast.error('Можете да споредувате максимум 3 возила');
      return;
    }

    const added = addComparison(id);
    if (added) {
      setIsInComparison(true);
      analytics.addToComparison(id, {
        title: listing?.title,
        price: listing?.price,
      });
      toast.success('Додадено во споредба');
    } else {
      toast.error('Возилото е веќе во споредба');
    }
  };

  const openImageModal = (index: number) => {
    setModalImageIndex(index);
    setIsImageModalOpen(true);
  };

  const closeImageModal = () => {
    setIsImageModalOpen(false);
  };

  const getClosingDate = (lastUpdatedAt: string): Date => {
    const date = new Date(lastUpdatedAt);
    date.setDate(date.getDate() + 90);
    return date;
  };

  const imagesLength = listing?.images?.length || 1;

  useEffect(() => {
    if (!isImageModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsImageModalOpen(false);
      }
      if (e.key === 'ArrowLeft') {
        setModalImageIndex((prev) => (prev - 1 + imagesLength) % imagesLength);
      }
      if (e.key === 'ArrowRight') {
        setModalImageIndex((prev) => (prev + 1) % imagesLength);
      }
    };

    const preventScroll = (e: TouchEvent) => {
      if (e.touches.length > 1) return;
      e.preventDefault();
    };

    document.body.style.overflow = 'hidden';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('touchmove', preventScroll, { passive: false });

    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('touchmove', preventScroll);
    };
  }, [isImageModalOpen, imagesLength]);

  useEffect(() => {
    if (isImageModalOpen || !listing) return;

    const images =
      listing.images && listing.images.length > 0 ? listing.images : ['/placeholder-car.jpg'];

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.key === 'ArrowLeft' && images.length > 1) {
        e.preventDefault();
        setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
      }
      if (e.key === 'ArrowRight' && images.length > 1) {
        e.preventDefault();
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isImageModalOpen, listing]);

  useEffect(() => {
    if (!listing || typeof window === 'undefined') return;

    const images =
      listing.images && listing.images.length > 0 ? listing.images : ['/placeholder-car.jpg'];

    const preloadImage = (imageUrl: string, quality: number = 75, width: number = 1200) => {
      if (!imageUrl || imageUrl === '/placeholder-car.jpg') return;

      const optimizedUrl = getOptimizedImageUrl(imageUrl, quality, width);
      if (preloadedImagesRef.current.has(optimizedUrl)) return;

      const img = new window.Image();
      img.src = optimizedUrl;
      preloadedImagesRef.current.add(optimizedUrl);
    };

    const preloadAdjacentImages = () => {
      if (images.length <= 1) return;

      const prevIndex = (currentImageIndex - 1 + images.length) % images.length;
      const nextIndex = (currentImageIndex + 1) % images.length;

      if (images[prevIndex] && !imageErrors.has(prevIndex)) {
        preloadImage(images[prevIndex]);
      }
      if (images[nextIndex] && !imageErrors.has(nextIndex)) {
        preloadImage(images[nextIndex]);
      }
    };

    preloadAdjacentImages();
  }, [currentImageIndex, listing, imageErrors]);

  useEffect(() => {
    if (!listing || typeof window === 'undefined') return;

    const images =
      listing.images && listing.images.length > 0 ? listing.images : ['/placeholder-car.jpg'];

    const preloadImage = (imageUrl: string, quality: number = 75, width: number = 1200) => {
      if (!imageUrl || imageUrl === '/placeholder-car.jpg') return;

      const optimizedUrl = getOptimizedImageUrl(imageUrl, quality, width);
      if (preloadedImagesRef.current.has(optimizedUrl)) return;

      const img = new window.Image();
      img.src = optimizedUrl;
      preloadedImagesRef.current.add(optimizedUrl);
    };

    const preloadAllImages = () => {
      images.forEach((imageUrl, index) => {
        if (imageUrl && imageUrl !== '/placeholder-car.jpg' && !imageErrors.has(index)) {
          preloadImage(imageUrl, 75, 1200);
        }
      });
    };

    const timeoutId = setTimeout(() => {
      preloadAllImages();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [listing, imageErrors]);

  useEffect(() => {
    if (!isImageModalOpen || !listing || typeof window === 'undefined') return;

    const images =
      listing.images && listing.images.length > 0 ? listing.images : ['/placeholder-car.jpg'];

    const preloadModalImage = (imageUrl: string) => {
      if (!imageUrl || imageUrl === '/placeholder-car.jpg') return;

      const optimizedUrl = getOptimizedImageUrl(imageUrl, 85, 1920);
      if (preloadedImagesRef.current.has(optimizedUrl)) return;

      const img = new window.Image();
      img.src = optimizedUrl;
      preloadedImagesRef.current.add(optimizedUrl);
    };

    const preloadModalAdjacentImages = () => {
      if (images.length <= 1) return;

      const prevIndex = (modalImageIndex - 1 + images.length) % images.length;
      const nextIndex = (modalImageIndex + 1) % images.length;

      if (images[prevIndex] && !imageErrors.has(prevIndex)) {
        preloadModalImage(images[prevIndex]);
      }
      if (images[nextIndex] && !imageErrors.has(nextIndex)) {
        preloadModalImage(images[nextIndex]);
      }
    };

    const preloadAllModalImages = () => {
      images.forEach((imageUrl, index) => {
        if (imageUrl && imageUrl !== '/placeholder-car.jpg' && !imageErrors.has(index)) {
          preloadModalImage(imageUrl);
        }
      });
    };

    preloadModalAdjacentImages();

    const timeoutId = setTimeout(() => {
      preloadAllModalImages();
    }, 200);

    return () => clearTimeout(timeoutId);
  }, [modalImageIndex, isImageModalOpen, listing, imageErrors]);

  if (!listing && !showSkeleton) {
    return null;
  }

  if (!listing || showSkeleton) {
    return (
      <>
        <div className="max-w-6xl mx-auto">
          <BreadcrumbsSkeleton />
          <div className="grid grid-cols-1 lg:grid-cols-[65%_35%] gap-6 md:gap-8">
            <div className="space-y-6">
              <div>
                <MainImageSkeleton />
                <ThumbnailsSkeleton />
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <TitleSkeleton />
                <PriceSkeleton />
                <BadgesSkeleton />
                <div className="mt-8">
                  <FavoriteButtonSkeleton />
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-primary-500/20 my-8"></div>

          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            <p className="mt-4 text-gray-300">Вчитување...</p>
          </div>
        </div>
      </>
    );
  }

  const images =
    listing.images && listing.images.length > 0 ? listing.images : ['/placeholder-car.jpg'];
  const vehicle = listing.vehicle;
  const closingDate = getClosingDate(listing.last_updated_at);

  const brand = vehicle?.brand?.name || '';
  const model = vehicle?.model?.name || '';
  const year = vehicle?.year || '';
  const vehicleInfo = [brand, model, year].filter(Boolean).join(' ');
  const h1Title = vehicleInfo || listing.title || 'Автомобил за продажба';

  const nextImage = () => {
    setModalImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setModalImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    touchEndX.current = null;
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const onTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && images.length > 1) {
      nextImage();
    }
    if (isRightSwipe && images.length > 1) {
      prevImage();
    }
  };

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} е копирано`);
    } catch {
      toast.error('Грешка при копирање');
    }
  };

  return (
    <>
      <StructuredData listing={listing} />
      <div className="max-w-6xl mx-auto">
        <Breadcrumbs
          items={[{ label: 'Почетна', href: '/' }, { label: listing.title }]}
          className="mb-6"
        />
        <div className="grid grid-cols-1 lg:grid-cols-[65%_35%] gap-6 md:gap-8">
          <div className="space-y-6">
            <div>
              <div
                onClick={() => openImageModal(currentImageIndex)}
                className="relative h-64 sm:h-80 md:h-96 bg-bg-darker rounded-xl overflow-hidden mb-4 w-full cursor-pointer border border-transparent hover:border-primary-500/50 transition-colors"
              >
                {images[currentImageIndex] &&
                images[currentImageIndex] !== '/placeholder-car.jpg' &&
                !imageErrors.has(currentImageIndex) ? (
                  (() => {
                    const optimizedUrl = getOptimizedImageUrl(images[currentImageIndex], 75, 1200);
                    const isExternal =
                      optimizedUrl.startsWith('http://') || optimizedUrl.startsWith('https://');
                    return isExternal ? (
                      <img
                        src={optimizedUrl}
                        alt={listing.title}
                        className="w-full h-full object-cover"
                        crossOrigin="anonymous"
                        onError={() => {
                          setImageErrors((prev) => new Set(prev).add(currentImageIndex));
                        }}
                      />
                    ) : (
                      <Image
                        src={optimizedUrl}
                        alt={listing.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 65vw"
                        className="object-cover"
                        priority
                        onError={() => {
                          setImageErrors((prev) => new Set(prev).add(currentImageIndex));
                        }}
                      />
                    );
                  })()
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <svg
                      className="w-24 h-24"
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
                )}
                {/* <button
                  onClick={(e) => {
                    e.stopPropagation();
                    openImageModal(currentImageIndex);
                  }}
                  className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10 p-2 sm:p-2.5 bg-black hover:bg-gray-900 rounded-lg transition-all text-primary-400 hover:text-primary-300 border-2 border-primary-500 hover:border-primary-400"
                  title="Отвори на полн формат"
                >
                  <svg
                    className="w-5 h-5 sm:w-6 sm:h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                    />
                  </svg>
                </button> */}
              </div>

              {images.length > 1 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {images.slice(0, 4).map((img, index) => {
                    const isLastThumbnailMobile = index === 2;
                    const isLastThumbnailDesktop = index === 3;
                    const hasMoreImagesMobile = images.length > 3;
                    const hasMoreImagesDesktop = images.length > 4;
                    const remainingCountMobile = images.length - 3;
                    const remainingCountDesktop = images.length - 4;

                    return (
                      <div
                        key={index}
                        onClick={() => {
                          setCurrentImageIndex(index);
                        }}
                        className={`relative h-28 sm:h-32 bg-bg-darker rounded-lg overflow-hidden transition-all cursor-pointer ${
                          index === 3 ? 'hidden sm:block' : ''
                        } ${
                          currentImageIndex === index
                            ? 'ring-2 ring-primary-500 shadow-md'
                            : 'hover:ring-2 hover:ring-primary-300'
                        }`}
                      >
                        {img !== '/placeholder-car.jpg' && !imageErrors.has(index) ? (
                          (() => {
                            const optimizedUrl = getOptimizedImageUrl(img, 70, 400);
                            const isExternal =
                              optimizedUrl.startsWith('http://') ||
                              optimizedUrl.startsWith('https://');
                            return (
                              <>
                                {isExternal ? (
                                  <img
                                    src={optimizedUrl}
                                    alt={`${listing.title} - Слика ${index + 1}`}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                    crossOrigin="anonymous"
                                    onError={() => {
                                      setImageErrors((prev) => new Set(prev).add(index));
                                    }}
                                  />
                                ) : (
                                  <Image
                                    src={optimizedUrl}
                                    alt={`${listing.title} - Слика ${index + 1}`}
                                    fill
                                    sizes="(max-width: 640px) 33vw, 25vw"
                                    className="object-cover"
                                    loading="lazy"
                                    onError={() => {
                                      setImageErrors((prev) => new Set(prev).add(index));
                                    }}
                                  />
                                )}
                                {isLastThumbnailMobile && hasMoreImagesMobile && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCurrentImageIndex(index);
                                      openImageModal(index);
                                    }}
                                    className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center sm:hidden cursor-pointer hover:bg-opacity-70 transition-opacity"
                                  >
                                    <span className="text-white text-lg font-bold">
                                      +{remainingCountMobile}
                                    </span>
                                  </button>
                                )}
                                {isLastThumbnailDesktop && hasMoreImagesDesktop && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCurrentImageIndex(index);
                                      openImageModal(index);
                                    }}
                                    className="absolute inset-0 bg-black bg-opacity-60 hidden sm:flex items-center justify-center cursor-pointer hover:bg-opacity-70 transition-opacity"
                                  >
                                    <span className="text-white text-lg sm:text-xl font-bold">
                                      +{remainingCountDesktop}
                                    </span>
                                  </button>
                                )}
                              </>
                            );
                          })()
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
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
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold mb-6 text-white">
                {h1Title}
              </h1>
              <div className="mb-6">
                <div className="flex items-baseline gap-3 flex-wrap mb-6">
                  {listing.status === 'Closed' || listing.price === undefined ? (
                    <>
                      <span className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-primary-400">
                        ••••
                      </span>
                      <span className="text-lg md:text-xl text-primary-400 font-medium">••</span>
                    </>
                  ) : (
                    <>
                      <span className="text-3xl sm:text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent">
                        {formatPrice(listing.price, listing.currency)}
                      </span>
                      <span className="text-lg md:text-xl text-gray-300 font-medium">
                        {listing.currency}
                      </span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {listing.status === 'Closed' && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-red-500/20 border border-red-500/40 text-red-300 shadow-sm">
                      <span>🔒</span>
                      <span>Затворено</span>
                    </span>
                  )}
                  {listing.is_new && (
                    <span className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-semibold bg-primary-500/20 border border-primary-500/40 text-primary-300 shadow-sm">
                      <span>✨</span>
                      <span>Ново</span>
                    </span>
                  )}
                  {listing.urgent && (
                    <span className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-semibold bg-primary-500/20 border border-primary-500/40 text-primary-300 shadow-sm">
                      <span>🔥</span>
                      <span>Итно</span>
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleToggleFavorite}
                  disabled={!!(user && listing.user && user.id === listing.user.id)}
                  className={`w-full sm:w-auto sm:max-w-fit px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 ${
                    user && listing.user && user.id === listing.user.id
                      ? 'bg-primary-500/10 text-primary-300 border border-primary-500/30 cursor-not-allowed'
                      : isFavorite
                        ? 'bg-bg-light text-white border-2 border-primary-500/30 hover:bg-primary-500/10 hover:border-primary-500'
                        : 'btn-secondary'
                  }`}
                  title={
                    user && listing.user && user.id === listing.user.id
                      ? 'Не можете да додадете своја објава во омилени'
                      : ''
                  }
                >
                  <svg
                    className="w-5 h-5"
                    fill={isFavorite ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                  {user && listing.user && user.id === listing.user.id
                    ? 'Ваша објава'
                    : isFavorite
                      ? 'Отстрани од омилени'
                      : 'Додади во омилени'}
                </button>
                {listing.status !== 'Closed' && (
                  <button
                    onClick={handleToggleComparison}
                    disabled={isInComparison}
                    className={`w-full sm:w-auto sm:max-w-fit px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 ${
                      isInComparison
                        ? 'bg-primary-500/10 text-primary-300 border border-primary-500/30 cursor-not-allowed'
                        : 'btn-secondary'
                    }`}
                    title={isInComparison ? 'Возилото е веќе во споредба' : ''}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3"
                      />
                    </svg>
                    {isInComparison ? 'Веќе во споредба' : 'Спореди'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-primary-500/20 my-8"></div>

        <div className="grid grid-cols-1 lg:grid-cols-[65%_35%] gap-6 md:gap-8">
          <div className="space-y-6">
            {vehicle && (
              <div className="surface">
                <h2 className="text-xl md:text-2xl font-bold mb-4 text-primary-400">
                  Карактеристики
                </h2>
                <div className="space-y-4">
                  {(vehicle.brand?.name || vehicle.model?.name || vehicle.year || listing.vin) && (
                    <div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {vehicle.brand?.name && (
                          <div>
                            <span className="text-primary-400 font-semibold">Марка:</span>
                            <span className="ml-2 text-gray-300">{vehicle.brand.name}</span>
                          </div>
                        )}
                        {vehicle.model?.name && (
                          <div>
                            <span className="text-primary-400 font-semibold">Модел:</span>
                            <span className="ml-2 text-gray-300">{vehicle.model.name}</span>
                          </div>
                        )}
                        {vehicle.year && (
                          <div>
                            <span className="text-primary-400 font-semibold">Година:</span>
                            <span className="ml-2 text-gray-300">{vehicle.year}</span>
                          </div>
                        )}
                        {listing.vin && (
                          <div className="flex items-center">
                            <span className="text-primary-400 font-semibold">VIN:</span>
                            <span className="ml-2 text-gray-300">{listing.vin}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopy(listing.vin!, 'VIN');
                              }}
                              className="ml-2 p-1.5 text-primary-400 hover:text-primary-300 hover:bg-primary-500/10 rounded transition-colors"
                              title="Копирај VIN"
                            >
                              <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {(vehicle.engine_displ_l ||
                    listing.horsepower !== undefined ||
                    vehicle.fuel ||
                    vehicle.transmission ||
                    vehicle.drive_type ||
                    vehicle.mileage_km) && (
                    <div className="pt-4 border-t border-primary-500/30">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {vehicle.engine_displ_l && (
                          <div>
                            <span className="text-primary-400 font-semibold">Мотор:</span>
                            <span className="ml-2 text-gray-300">
                              {formatEngineVolume(vehicle.engine_displ_l)} л
                            </span>
                          </div>
                        )}
                        {listing.horsepower !== undefined && listing.horsepower !== null && (
                          <div>
                            <span className="text-primary-400 font-semibold">Коњски сили:</span>
                            <span className="ml-2 text-gray-300">{listing.horsepower}</span>
                          </div>
                        )}
                        {vehicle.fuel && (
                          <div>
                            <span className="text-primary-400 font-semibold">Гориво:</span>
                            <span className="ml-2 text-gray-300">{vehicle.fuel}</span>
                          </div>
                        )}
                        {vehicle.transmission && (
                          <div>
                            <span className="text-primary-400 font-semibold">Пренос:</span>
                            <span className="ml-2 text-gray-300">
                              {formatTransmission(vehicle.transmission)}
                            </span>
                          </div>
                        )}
                        {vehicle.drive_type && (
                          <div>
                            <span className="text-primary-400 font-semibold">Тип на погон:</span>
                            <span className="ml-2 text-gray-300">
                              {formatDriveType(vehicle.drive_type)}
                            </span>
                          </div>
                        )}
                        {vehicle.mileage_km && (
                          <div>
                            <span className="text-primary-400 font-semibold">Поминување:</span>
                            <span className="ml-2 text-gray-300">
                              {formatMileage(vehicle.mileage_km)} км
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {(vehicle.body_type || vehicle.color || vehicle.doors) && (
                    <div className="pt-4 border-t border-primary-500/30">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {vehicle.body_type && (
                          <div>
                            <span className="text-primary-400 font-semibold">
                              Тип на каросерија:
                            </span>
                            <span className="ml-2 text-gray-300">
                              {formatBodyType(vehicle.body_type)}
                            </span>
                          </div>
                        )}
                        {vehicle.color && (
                          <div>
                            <span className="text-primary-400 font-semibold">Боја:</span>
                            <span className="ml-2 text-gray-300">{vehicle.color}</span>
                          </div>
                        )}
                        {vehicle.doors && (
                          <div>
                            <span className="text-primary-400 font-semibold">Врати:</span>
                            <span className="ml-2 text-gray-300">{vehicle.doors}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {(listing.condition ||
                    listing.registration_type ||
                    listing.is_registered !== undefined) && (
                    <div className="pt-4 border-t border-primary-500/30">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {listing.condition && (
                          <div>
                            <span className="text-primary-400 font-semibold">Состојба:</span>
                            <span className="ml-2 text-gray-300">
                              {formatCondition(listing.condition)}
                            </span>
                          </div>
                        )}
                        {listing.registration_type && (
                          <div>
                            <span className="text-primary-400 font-semibold">
                              Тип на регистрација:
                            </span>
                            <span className="ml-2 text-gray-300">
                              {formatRegistrationType(listing.registration_type)}
                            </span>
                          </div>
                        )}
                        {listing.is_registered !== undefined && (
                          <div>
                            <span className="text-primary-400 font-semibold">Регистрација:</span>
                            <span className="ml-2 text-gray-300">
                              {listing.is_registered ? 'Зарегистрирано' : 'Не е зарегистрирано'}
                            </span>
                          </div>
                        )}
                        {listing.is_registered && listing.registration_expires_at && (
                          <div>
                            <span className="text-primary-400 font-semibold">Регистрирано до:</span>
                            <span className="ml-2 text-gray-300">
                              {(() => {
                                const date = new Date(listing.registration_expires_at);
                                const month = String(date.getMonth() + 1).padStart(2, '0');
                                const year = date.getFullYear();
                                return `${month}.${year}`;
                              })()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {listing.description && (
              <div className="surface">
                <h2 className="text-xl md:text-2xl font-bold mb-4 text-primary-400">Опис</h2>
                <div
                  className="text-gray-300 leading-relaxed max-w-none listing-description"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(listing.description, {
                      ALLOWED_TAGS: [
                        'p',
                        'br',
                        'div',
                        'strong',
                        'em',
                        'i',
                        'b',
                        'u',
                        'ul',
                        'ol',
                        'li',
                        'font',
                      ],
                      ALLOWED_ATTR: ['size'],
                    }),
                  }}
                />
                <style jsx>{`
                  .listing-description {
                    color: #d1d5db;
                    line-height: 1.75;
                  }
                  .listing-description div,
                  .listing-description p {
                    display: block;
                    margin: 0.75rem 0;
                    min-height: 1.2em;
                    line-height: 1.6;
                    color: #d1d5db;
                  }
                  .listing-description div:empty,
                  .listing-description p:empty {
                    min-height: 1.5rem;
                    margin: 0.5rem 0;
                  }
                  .listing-description div:first-child,
                  .listing-description p:first-child {
                    margin-top: 0;
                  }
                  .listing-description div:last-child,
                  .listing-description p:last-child {
                    margin-bottom: 0;
                  }
                  .listing-description p:has(br:only-child) {
                    min-height: 1.5rem;
                    margin: 0.5rem 0;
                  }
                  .listing-description font[size='2'] {
                    font-size: 0.875rem !important;
                  }
                  .listing-description font[size='3'] {
                    font-size: 1rem !important;
                  }
                  .listing-description font[size='5'] {
                    font-size: 1.125rem !important;
                  }
                  .listing-description strong,
                  .listing-description b {
                    font-weight: 700 !important;
                    color: #d1d5db !important;
                  }
                  .listing-description em,
                  .listing-description i {
                    font-style: italic !important;
                    color: #d1d5db !important;
                  }
                  .listing-description u {
                    text-decoration: underline;
                    color: #d1d5db;
                  }
                  .listing-description ul {
                    list-style-type: disc !important;
                    list-style-position: outside !important;
                    display: block !important;
                    margin: 0.75rem 0 !important;
                    padding-left: 2rem !important;
                    color: #d1d5db !important;
                  }
                  .listing-description ol {
                    list-style-type: decimal !important;
                    list-style-position: outside !important;
                    display: block !important;
                    margin: 0.75rem 0 !important;
                    padding-left: 2rem !important;
                    color: #d1d5db !important;
                  }
                  .listing-description li {
                    display: list-item !important;
                    list-style-position: outside !important;
                    margin: 0.25rem 0 !important;
                    padding-left: 0.5rem !important;
                    color: #d1d5db !important;
                  }
                  .listing-description ul li {
                    list-style-type: disc !important;
                    list-style-position: outside !important;
                  }
                  .listing-description ol li {
                    list-style-type: decimal !important;
                    list-style-position: outside !important;
                  }
                `}</style>
              </div>
            )}

            <div className="surface">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-xl md:text-2xl font-bold text-primary-400">
                  {listing.vin ? 'Претходни објави за ова возило' : 'Историја на возило'}
                </h2>
                {listing.vin && (
                  <div className="relative group">
                    <button
                      type="button"
                      onClick={() => setShowHistoryHint(!showHistoryHint)}
                      className="focus:outline-none"
                    >
                      <svg
                        className="w-4 h-4 text-primary-400 hover:text-primary-300 cursor-help transition-colors"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </button>
                    <div
                      className={`absolute right-0 bottom-full mb-2 ${showHistoryHint ? 'block' : 'hidden group-hover:block'} z-10 w-64`}
                    >
                      <div className="bg-bg-darker border-2 border-primary-500/50 rounded-lg p-3 shadow-lg">
                        <p className="text-xs font-semibold text-gray-300 leading-relaxed">
                          Прикажуваме претходни објави за ова возило со ист VIN. За заштита на
                          приватност, цената и личните податоци на авторите се скриени за затворени
                          објави.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {!listing.vin ? (
                <div className="flex items-start gap-3 p-4 bg-primary-500/10 border border-primary-500/30 rounded-lg">
                  <svg
                    className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <div>
                    <p className="font-semibold text-primary-300 text-sm mb-1">
                      VIN кодот не е наведен
                    </p>
                    <p className="text-gray-300 text-sm">
                      За да можеме да провериме историјата на ова возило, потребно е да биде наведен
                      VIN код во објавата. Без VIN код, не можеме да идентификуваме претходни објави
                      за истото возило.
                    </p>
                  </div>
                </div>
              ) : loadingPrevious ? (
                <div className="text-center py-4">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                </div>
              ) : previousListings.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-primary-500/20">
                        <th className="text-left py-2 px-2 sm:px-3 text-gray-300 font-semibold text-xs sm:text-sm">
                          Наслов
                        </th>
                        <th className="text-left py-2 px-2 sm:px-3 text-gray-300 font-semibold text-xs sm:text-sm hidden sm:table-cell">
                          Поминување
                        </th>
                        <th className="text-left py-2 px-2 sm:px-3 text-gray-300 font-semibold text-xs sm:text-sm hidden md:table-cell">
                          Затворено
                        </th>
                        <th className="text-left sm:text-right py-2 px-2 sm:px-3 text-gray-300 font-semibold text-xs sm:text-sm"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {previousListings.map((prevListing) => (
                        <tr
                          key={prevListing.id}
                          className="border-b border-primary-500/10 hover:bg-bg-darker/50 transition-colors cursor-pointer"
                          onClick={() => router.push(`/listings/${prevListing.id}`)}
                        >
                          <td className="py-3 px-2 sm:px-3 text-white text-xs sm:text-sm">
                            {prevListing.title}
                          </td>
                          <td className="py-3 px-2 sm:px-3 font-semibold text-gray-300 text-xs sm:text-sm hidden sm:table-cell">
                            {prevListing.vehicle?.mileage_km
                              ? formatMileage(prevListing.vehicle.mileage_km) + ' км'
                              : '-'}
                          </td>
                          <td className="py-3 px-2 sm:px-3 font-semibold text-gray-300 text-xs sm:text-sm hidden md:table-cell">
                            {formatDate(prevListing.updated_at)}
                          </td>
                          <td className="py-3 px-2 sm:px-3 text-left sm:text-right">
                            <span className="text-primary-400 hover:text-primary-300 transition-colors text-xs font-medium">
                              Отвори →
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-300">Нема претходни објави за ова возило</p>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="surface">
              <h2 className="text-xl md:text-2xl font-bold mb-4 text-primary-400">
                Контактни информации
              </h2>
              {listing.user && (
                <div className="space-y-4">
                  <div>
                    <span className="font-semibold text-primary-400">Тип на продавач:</span>
                    <span
                      className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold ml-2 ${
                        listing.user.type === 'Business'
                          ? 'bg-blue-500/20 text-blue-300'
                          : 'bg-primary-500/20 text-primary-300'
                      }`}
                    >
                      {listing.user.type === 'Business' ? 'Правно лице' : 'Физичко лице'}
                    </span>
                  </div>

                  {listing.status !== 'Closed' &&
                    listing.user.type === 'Business' &&
                    listing.user.companyName && (
                      <div>
                        <span className="font-semibold text-primary-400">Компанија:</span>
                        <span className="ml-2 text-gray-300">{listing.user.companyName}</span>
                      </div>
                    )}

                  {listing.status !== 'Closed' &&
                    listing.user.type === 'Individual' &&
                    listing.user.firstName &&
                    listing.user.lastName && (
                      <div>
                        <span className="font-semibold text-primary-400">Име:</span>
                        <span className="ml-2 text-gray-300">
                          {listing.user.firstName} {listing.user.lastName}
                        </span>
                      </div>
                    )}

                  <div>
                    <span className="font-semibold text-primary-400">Град:</span>
                    <span className="ml-2 text-gray-300">{getCityNameMk(listing.city)}</span>
                  </div>

                  {listing.status === 'Closed' ? (
                    <div>
                      <span className="font-semibold text-primary-400">Email:</span>
                      <span className="ml-2 text-primary-400">••••••••</span>
                    </div>
                  ) : (
                    listing.user.email && (
                      <div className="flex items-center">
                        <span className="font-semibold text-primary-400">Email:</span>
                        <a
                          href={`mailto:${listing.user.email}`}
                          className="ml-2 text-gray-300 hover:text-primary-300 transition-colors underline"
                        >
                          {listing.user.email}
                        </a>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleCopy(listing.user!.email!, 'Email');
                          }}
                          className="ml-2 p-1.5 text-primary-400 hover:text-primary-300 hover:bg-primary-500/10 rounded transition-colors"
                          title="Копирај email"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                            />
                          </svg>
                        </button>
                      </div>
                    )
                  )}

                  {listing.status === 'Closed' ? (
                    <div>
                      <span className="font-semibold text-primary-400">Телефон:</span>
                      <span className="ml-2 text-primary-400">••••••••</span>
                    </div>
                  ) : (
                    listing.user.phone && (
                      <div className="flex items-center">
                        <span className="font-semibold text-primary-400">Телефон:</span>
                        <a
                          href={`tel:${listing.user.phone}`}
                          onClick={() => {
                            analytics.contactSeller(id, 'phone', {
                              title: listing.title,
                              price: listing.price,
                            });
                          }}
                          className="ml-2 text-gray-300 hover:text-primary-300 transition-colors underline"
                        >
                          {listing.user.phone}
                        </a>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleCopy(listing.user!.phone!, 'Телефон');
                          }}
                          className="ml-2 p-1.5 text-primary-400 hover:text-primary-300 hover:bg-primary-500/10 rounded transition-colors"
                          title="Копирај телефон"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                            />
                          </svg>
                        </button>
                      </div>
                    )
                  )}

                  {listing.status !== 'Closed' &&
                    (listing.user.viber || listing.user.whatsapp || listing.user.telegram) && (
                      <div>
                        <span className="font-semibold text-primary-400 mb-2 block">
                          Достапни месенџери:
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {listing.user.viber && listing.user.phone && (
                            <a
                              href={getViberUrl(listing.user.phone) || '#'}
                              onClick={() => {
                                analytics.contactSeller(id, 'viber', {
                                  title: listing.title,
                                  price: listing.price,
                                });
                              }}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30 hover:bg-purple-500/30 hover:border-purple-500/50 transition-colors cursor-pointer"
                            >
                              Viber
                            </a>
                          )}
                          {listing.user.whatsapp && listing.user.phone && (
                            <a
                              href={getWhatsAppUrl(listing.user.phone) || '#'}
                              onClick={() => {
                                analytics.contactSeller(id, 'whatsapp', {
                                  title: listing.title,
                                  price: listing.price,
                                });
                              }}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-primary-500/20 text-primary-300 border border-primary-500/30 hover:bg-primary-500/30 hover:border-primary-500/50 transition-colors cursor-pointer"
                            >
                              WhatsApp
                            </a>
                          )}
                          {listing.user.telegram && listing.user.phone && (
                            <a
                              href={getTelegramUrl(listing.user.phone) || '#'}
                              onClick={() => {
                                analytics.contactSeller(id, 'telegram', {
                                  title: listing.title,
                                  price: listing.price,
                                });
                              }}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30 hover:border-blue-500/50 transition-colors cursor-pointer"
                            >
                              Telegram
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                  {listing.user && (
                    <div className="pt-4 border-t border-primary-500/20">
                      <button
                        onClick={() => setIsUserListingsModalOpen(true)}
                        disabled={listing.status === 'Closed'}
                        className={`w-full px-4 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                          listing.status === 'Closed'
                            ? 'bg-bg-darker text-gray-500 border-2 border-primary-500/20 cursor-not-allowed opacity-50'
                            : 'bg-bg-light border-2 border-primary-500/30 text-primary-400 hover:bg-bg-light/80 hover:border-primary-500'
                        }`}
                        title={listing.status === 'Closed' ? 'Недостапно за затворени објави' : ''}
                      >
                        <svg
                          className="w-5 h-5 flex-shrink-0"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                          />
                        </svg>
                        <span>Сите објави од продавачот</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="surface">
              <div className="space-y-3">
                {listing.views !== undefined && listing.views > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <svg
                      className="w-4 h-4 text-primary-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                    <span className="font-semibold text-primary-400">Прегледи:</span>
                    <span className="text-gray-300">{listing.views}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <svg
                    className="w-4 h-4 text-primary-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="font-semibold text-primary-400">Ажурирано:</span>
                  <span className="text-gray-300">{formatDate(listing.last_updated_at)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <svg
                    className="w-4 h-4 text-primary-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="font-semibold text-primary-400">Ќе се затвори:</span>
                  <span className="text-gray-300">{formatDate(closingDate)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isImageModalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4"
          onClick={closeImageModal}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              closeImageModal();
            }}
            className="absolute top-2 right-2 sm:top-4 sm:right-4 text-primary-400 hover:text-primary-300 transition-colors z-10 p-2"
          >
            <svg
              className="w-6 h-6 sm:w-8 sm:h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {images.length > 1 && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  prevImage();
                }}
                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 text-primary-400 hover:text-primary-300 transition-all z-10 bg-black/70 hover:bg-black/90 rounded-full p-3 sm:p-4 border-2 border-primary-500/50 hover:border-primary-400 shadow-lg hidden sm:block"
              >
                <svg
                  className="w-8 h-8 sm:w-10 sm:h-10"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  nextImage();
                }}
                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 text-primary-400 hover:text-primary-300 transition-all z-10 bg-black/70 hover:bg-black/90 rounded-full p-3 sm:p-4 border-2 border-primary-500/50 hover:border-primary-400 shadow-lg hidden sm:block"
              >
                <svg
                  className="w-8 h-8 sm:w-10 sm:h-10"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </>
          )}

          <div
            className="relative max-w-7xl w-full h-full flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {images[modalImageIndex] &&
            images[modalImageIndex] !== '/placeholder-car.jpg' &&
            !imageErrors.has(modalImageIndex) ? (
              (() => {
                const optimizedUrl = getOptimizedImageUrl(images[modalImageIndex], 85, 1920);
                const isExternal =
                  optimizedUrl.startsWith('http://') || optimizedUrl.startsWith('https://');
                return isExternal ? (
                  <img
                    src={optimizedUrl}
                    alt={`${listing.title} - Слика ${modalImageIndex + 1} од ${images.length}`}
                    className="max-w-full max-h-[90vh] w-auto h-auto object-contain"
                    crossOrigin="anonymous"
                    onError={() => {
                      setImageErrors((prev) => new Set(prev).add(modalImageIndex));
                    }}
                  />
                ) : (
                  <Image
                    src={optimizedUrl}
                    alt={`${listing.title} - Слика ${modalImageIndex + 1} од ${images.length}`}
                    width={1200}
                    height={900}
                    sizes="(max-width: 768px) 100vw, 90vw"
                    className="max-w-full max-h-[90vh] w-auto h-auto object-contain"
                    priority={modalImageIndex === 0}
                    onError={() => {
                      setImageErrors((prev) => new Set(prev).add(modalImageIndex));
                    }}
                  />
                );
              })()
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300">
                <svg className="w-48 h-48" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12"
                  />
                </svg>
              </div>
            )}

            {images.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-primary-400 text-lg sm:text-xl font-semibold bg-black bg-opacity-50 px-4 py-2 rounded-full">
                {modalImageIndex + 1} / {images.length}
              </div>
            )}
          </div>
        </div>
      )}

      {listing?.user && (
        <UserListingsModal
          isOpen={isUserListingsModalOpen}
          onClose={() => setIsUserListingsModalOpen(false)}
          user={listing.user}
          fetchListings={async (userId: string) => {
            const res = await listingsApi.getUserActiveListings(userId);
            return res.data;
          }}
        />
      )}
    </>
  );
}
