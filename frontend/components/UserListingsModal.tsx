'use client';

import Image from 'next/image';
import Link from 'next/link';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';

import { useTranslation } from '@/hooks/useTranslation';
import { Listing, User } from '@/lib/api';
import {
  formatBodyType,
  formatDriveType,
  formatEngineVolume,
  formatMileage,
  formatPrice,
  formatTransmission,
  getCityNameMk,
  getOptimizedImageUrl,
} from '@/lib/utils';

import { Modal } from './Modal';

interface UserListingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  userId?: string;
  fetchListings: (_userId: string) => Promise<Listing[]>;
  showOnlyActive?: boolean;
}

function UserListingsModalComponent({
  isOpen,
  onClose,
  user,
  userId,
  fetchListings,
  showOnlyActive = true,
}: UserListingsModalProps) {
  const { t } = useTranslation();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const targetUserId = useMemo(() => userId || user?.id, [userId, user?.id]);
  const fetchListingsRef = useRef(fetchListings);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetchListingsRef.current = fetchListings;
  }, [fetchListings]);

  useEffect(() => {
    if (!isOpen) {
      setListings([]);
      setLoading(false);
      setImageErrors(new Set());
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      return;
    }

    if (!targetUserId) {
      setLoading(false);
      setListings([]);
      return;
    }

    setLoading(true);
    setListings([]);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const timeoutId = setTimeout(() => {
      if (!abortController.signal.aborted) {
        abortController.abort();
        setLoading(false);
        toast.error(t('userListings.loadingTimeout'));
      }
    }, 10000);

    const loadListings = async () => {
      try {
        const result = await fetchListingsRef.current(targetUserId);

        if (abortController.signal.aborted) {
          return;
        }

        clearTimeout(timeoutId);
        setListings(Array.isArray(result) ? result : []);
        setLoading(false);
      } catch {
        if (abortController.signal.aborted) {
          return;
        }

        clearTimeout(timeoutId);
        setListings([]);
        setLoading(false);
      }
    };

    loadListings();

    return () => {
      clearTimeout(timeoutId);
      abortController.abort();
      abortControllerRef.current = null;
    };
  }, [isOpen, targetUserId, t]);

  const getUserDisplayName = useMemo(() => {
    if (!user) return t('userListings.user');

    if (user.type === 'Business' && user.companyName) {
      return user.companyName;
    }

    if (user.type === 'Individual') {
      if (user.firstName && user.lastName) {
        return `${user.firstName} ${user.lastName}`;
      }
      if (user.firstName) {
        return user.firstName;
      }
      if (user.lastName) {
        return user.lastName;
      }
    }

    if (user.companyName) {
      return user.companyName;
    }

    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }

    if (user.firstName) {
      return user.firstName;
    }

    if (user.lastName) {
      return user.lastName;
    }

    if (user.email) {
      return user.email;
    }

    return t('userListings.user');
  }, [user, t]);

  const displayListings = useMemo(
    () => (showOnlyActive ? listings.filter((listing) => listing.status === 'Active') : listings),
    [listings, showOnlyActive]
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('userListings.title', { name: getUserDisplayName })}
      size="large"
    >
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-300">{t('userListings.loading')}</p>
        </div>
      ) : displayListings.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-300 text-lg">
            {showOnlyActive ? t('userListings.noActiveListings') : t('userListings.noListings')}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {displayListings.map((listing) => {
            const vehicle = listing.vehicle;
            const originalImageUrl = listing.images?.[0] || '/placeholder-car.jpg';
            const imageUrl = getOptimizedImageUrl(originalImageUrl, 80, 400);
            const hasImage = originalImageUrl && originalImageUrl !== '/placeholder-car.jpg';
            const imageError = imageErrors.has(listing.id);

            return (
              <Link
                key={listing.id}
                href={`/listings/${listing.id}`}
                onClick={onClose}
                className="block card overflow-hidden hover:bg-bg-light transition-colors"
              >
                <div className="p-6 space-y-4">
                  <div className="flex flex-col md:flex-row gap-4 items-start">
                    <div className="relative w-full md:w-40 md:h-[90px] aspect-video md:aspect-auto bg-bg-darker overflow-hidden rounded-xl">
                      {hasImage && !imageError ? (
                        (() => {
                          const isExternal =
                            imageUrl.startsWith('http://') || imageUrl.startsWith('https://');
                          return isExternal ? (
                            <img
                              src={imageUrl}
                              alt={listing.title}
                              className="w-full h-full object-cover rounded-xl"
                              crossOrigin="anonymous"
                              onError={() => {
                                setImageErrors((prev) => new Set(prev).add(listing.id));
                              }}
                            />
                          ) : (
                            <div className="relative w-full h-full">
                              <Image
                                src={imageUrl}
                                alt={listing.title}
                                fill
                                sizes="(max-width: 768px) 100vw, 160px"
                                className="object-cover rounded-xl"
                                onError={() => {
                                  setImageErrors((prev) => new Set(prev).add(listing.id));
                                }}
                              />
                            </div>
                          );
                        })()
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-500">
                          <svg
                            className="w-12 h-12"
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
                    <div className="flex-1 min-w-0 w-full md:w-auto grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 md:gap-6">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg text-white mb-3">{listing.title}</h3>
                        {vehicle && (
                          <div className="text-sm text-gray-300 space-y-1.5">
                            {vehicle.engine_displ_l && (
                              <div>
                                <span className="text-primary-400 font-semibold">
                                  {t('userListings.engine')}:
                                </span>
                                <span className="ml-2">
                                  {formatEngineVolume(vehicle.engine_displ_l)}{' '}
                                  {t('listings.liters')}
                                </span>
                              </div>
                            )}
                            {vehicle.fuel && (
                              <div>
                                <span className="text-primary-400 font-semibold">
                                  {t('userListings.fuel')}:
                                </span>
                                <span className="ml-2">{vehicle.fuel}</span>
                              </div>
                            )}
                            {vehicle.mileage_km && (
                              <div>
                                <span className="text-primary-400 font-semibold">
                                  {t('userListings.mileage')}:
                                </span>
                                <span className="ml-2">
                                  {formatMileage(vehicle.mileage_km)} {t('listings.km')}
                                </span>
                              </div>
                            )}
                            {vehicle.transmission && (
                              <div>
                                <span className="text-primary-400 font-semibold">
                                  {t('userListings.transmission')}:
                                </span>
                                <span className="ml-2">
                                  {formatTransmission(vehicle.transmission)}
                                </span>
                              </div>
                            )}
                            {vehicle.drive_type && (
                              <div>
                                <span className="text-primary-400 font-semibold">
                                  {t('userListings.driveType')}:
                                </span>
                                <span className="ml-2">{formatDriveType(vehicle.drive_type)}</span>
                              </div>
                            )}
                            {vehicle.body_type && (
                              <div>
                                <span className="text-primary-400 font-semibold">
                                  {t('userListings.bodyType')}:
                                </span>
                                <span className="ml-2">{formatBodyType(vehicle.body_type)}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-start text-left w-full md:items-end md:text-right md:min-w-[140px] md:w-auto">
                        {listing.price !== undefined ? (
                          <span className="text-xl font-extrabold bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent whitespace-nowrap mb-3">
                            {formatPrice(listing.price, listing.currency)} {listing.currency}
                          </span>
                        ) : (
                          <span className="text-xl font-extrabold text-primary-400 mb-3">••••</span>
                        )}
                        {!showOnlyActive && (
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold ${
                              listing.status === 'Active'
                                ? 'bg-primary-500/20 text-primary-300'
                                : listing.status === 'Paused'
                                  ? 'bg-yellow-500/20 text-yellow-300'
                                  : 'bg-gray-500/20 text-gray-300'
                            }`}
                          >
                            {listing.status === 'Active'
                              ? t('userListings.active')
                              : listing.status === 'Paused'
                                ? t('userListings.paused')
                                : t('userListings.closed')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {listing.city && (
                    <div className="text-sm border-t border-primary-500/20 pt-4">
                      <span className="text-primary-400 font-semibold">
                        {t('userListings.city')}:
                      </span>
                      <span className="ml-2 text-gray-300">{getCityNameMk(listing.city)}</span>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

export const UserListingsModal = React.memo(UserListingsModalComponent);
