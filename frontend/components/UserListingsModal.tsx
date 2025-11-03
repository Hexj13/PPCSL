'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import Link from 'next/link';
import { Modal } from './Modal';
import { Listing, User } from '@/lib/api';
import { formatPrice, formatEngineVolume, formatMileage, formatTransmission, formatBodyType } from '@/lib/utils';
import toast from 'react-hot-toast';

interface UserListingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  userId?: string;
  fetchListings: (userId: string) => Promise<Listing[]>;
  showOnlyActive?: boolean;
}

export function UserListingsModal({ isOpen, onClose, user, userId, fetchListings, showOnlyActive = true }: UserListingsModalProps) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);
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
        console.error('Timeout: fetchListings took too long');
        abortController.abort();
        setLoading(false);
        toast.error('Истече време за вчитување на објави');
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
      } catch (err: any) {
        if (abortController.signal.aborted) {
          return;
        }

        clearTimeout(timeoutId);
        console.error('Error fetching listings:', err);
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
  }, [isOpen, targetUserId]);

  const getUserDisplayName = () => {
    if (!user) return 'Корисник';
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.companyName) {
      return user.companyName;
    }
    return user.email;
  };

  const displayListings = showOnlyActive 
    ? listings.filter((listing) => listing.status === 'Active')
    : listings;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Објави од ${getUserDisplayName()}`}
      size="large"
    >
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          <p className="mt-4 text-gray-300">Вчитување...</p>
        </div>
      ) : displayListings.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-300 text-lg">{showOnlyActive ? 'Нема активни објави' : 'Нема објави'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayListings.map((listing) => {
            const vehicle = listing.vehicle;
            return (
              <Link
                key={listing.id}
                href={`/listings/${listing.id}`}
                className="block card p-4 hover:bg-bg-light transition-colors"
              >
                <div className="space-y-3">
                  <div>
                    <h3 className="font-bold text-lg text-white mb-2">{listing.title}</h3>
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-xl font-extrabold bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent">
                        {formatPrice(listing.price, listing.currency)} {listing.currency}
                      </span>
                      {!showOnlyActive && (
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          listing.status === 'Active'
                            ? 'bg-green-500/20 text-green-300'
                            : listing.status === 'Paused'
                            ? 'bg-yellow-500/20 text-yellow-300'
                            : 'bg-gray-500/20 text-gray-300'
                        }`}>
                          {listing.status === 'Active'
                            ? 'Активна'
                            : listing.status === 'Paused'
                            ? 'Привремено застарена'
                            : 'Затворена'}
                        </span>
                      )}
                    </div>
                  </div>

                  {vehicle && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm border-t border-primary-500/20 pt-3">
                      {vehicle.brand && vehicle.model && (
                        <div>
                          <span className="text-primary-400 font-semibold">Марка/Модел:</span>
                          <span className="ml-2 text-gray-300">{vehicle.brand.name} {vehicle.model.name}</span>
                        </div>
                      )}
                      {vehicle.year && (
                        <div>
                          <span className="text-primary-400 font-semibold">Година:</span>
                          <span className="ml-2 text-gray-300">{vehicle.year}</span>
                        </div>
                      )}
                      {vehicle.engine_displ_l && (
                        <div>
                          <span className="text-primary-400 font-semibold">Мотор (л):</span>
                          <span className="ml-2 text-gray-300">{formatEngineVolume(vehicle.engine_displ_l)}</span>
                        </div>
                      )}
                      {vehicle.mileage_km && (
                        <div>
                          <span className="text-primary-400 font-semibold">Поминување:</span>
                          <span className="ml-2 text-gray-300">{formatMileage(vehicle.mileage_km)} км</span>
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
                          <span className="ml-2 text-gray-300">{formatTransmission(vehicle.transmission)}</span>
                        </div>
                      )}
                      {vehicle.body_type && (
                        <div>
                          <span className="text-primary-400 font-semibold">Тип на каросерија:</span>
                          <span className="ml-2 text-gray-300">{formatBodyType(vehicle.body_type)}</span>
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
                      {listing.city && (
                        <div>
                          <span className="text-primary-400 font-semibold">Град:</span>
                          <span className="ml-2 text-gray-300">{listing.city}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {!vehicle && listing.city && (
                    <div className="text-sm border-t border-primary-500/20 pt-3">
                      <span className="text-primary-400 font-semibold">Град:</span>
                      <span className="ml-2 text-gray-300">{listing.city}</span>
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

