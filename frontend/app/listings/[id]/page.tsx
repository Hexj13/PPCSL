'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { listingsApi, Listing, favoritesApi } from '@/lib/api';
import { useAuthStore, useFavoritesStore } from '@/lib/store';
import {
  formatPrice,
  formatDate,
  formatMileage,
  formatEngineVolume,
  formatTransmission,
  formatBodyType,
} from '@/lib/utils';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { UserListingsModal } from '@/components/UserListingsModal';

export default function ListingPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { user } = useAuthStore();
  const { add: addFavorite, remove: removeFavorite, check } = useFavoritesStore();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [modalImageIndex, setModalImageIndex] = useState(0);
  const [isUserListingsModalOpen, setIsUserListingsModalOpen] = useState(false);
  const [previousListings, setPreviousListings] = useState<Listing[]>([]);
  const [loadingPrevious, setLoadingPrevious] = useState(false);

  useEffect(() => {
    listingsApi
      .getOne(id)
      .then((res) => {
        setListing(res.data);
        if (res.data.vin) {
          setLoadingPrevious(true);
          listingsApi
            .getByVin(res.data.vin, id)
            .then((vinRes) => {
              setPreviousListings(vinRes.data);
            })
            .catch(() => {
              setPreviousListings([]);
            })
            .finally(() => setLoadingPrevious(false));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    if (user) {
      favoritesApi
        .check(id)
        .then((res) => {
          setIsFavorite(res.data.isFavorite);
        })
        .catch(() => {
          setIsFavorite(check(id));
        });
    } else {
      setIsFavorite(check(id));
    }
  }, [id, user, check]);

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

    if (listing && user && listing.user && user.id === listing.user.id) {
      return;
    }

    try {
      if (isFavorite) {
        await favoritesApi.remove(id);
        removeFavorite(id);
        setIsFavorite(false);
        toast.success('Отстрането од омилени');
      } else {
        await favoritesApi.add(id);
        addFavorite(id);
        setIsFavorite(true);
        toast.success('Додадено во омилени');
      }
    } catch (err) {
      if (!isFavorite) {
        addFavorite(id);
        setIsFavorite(true);
      } else {
        removeFavorite(id);
        setIsFavorite(false);
      }
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

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isImageModalOpen, imagesLength]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <p className="mt-4 text-gray-300">Вчитување...</p>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-300 text-lg">Објавата не е пронајдена</p>
      </div>
    );
  }

  const images =
    listing.images && listing.images.length > 0 ? listing.images : ['/placeholder-car.jpg'];
  const vehicle = listing.vehicle;
  const closingDate = getClosingDate(listing.last_updated_at);

  const nextImage = () => {
    setModalImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setModalImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} е копирано`);
    } catch (err) {
      toast.error('Грешка при копирање');
    }
  };

  return (
    <>
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[65%_35%] gap-6 md:gap-8">
          <div className="space-y-6">
            <div>
              <button
                onClick={() => openImageModal(currentImageIndex)}
                className="relative h-64 sm:h-80 md:h-96 bg-bg-darker rounded-xl overflow-hidden mb-4 cursor-pointer hover:opacity-90 transition-opacity w-full"
              >
                {images[currentImageIndex] &&
                images[currentImageIndex] !== '/placeholder-car.jpg' ? (
                  <Image
                    src={images[currentImageIndex]}
                    alt={listing.title}
                    fill
                    className="object-cover"
                  />
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
              </button>

              {images.length > 1 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {images.map((img, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setCurrentImageIndex(index);
                        openImageModal(index);
                      }}
                      className={`relative h-20 bg-bg-darker rounded-lg overflow-hidden transition-all ${
                        currentImageIndex === index
                          ? 'ring-2 ring-primary-500 shadow-md'
                          : 'hover:ring-2 hover:ring-primary-300'
                      }`}
                    >
                      {img !== '/placeholder-car.jpg' ? (
                        <Image src={img} alt={`${index + 1}`} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">
                          <span className="text-xs">{index + 1}</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold mb-6 text-white">
                {listing.title}
              </h1>
              <div className="mb-8">
                <div className="flex items-baseline gap-3 flex-wrap mb-5">
                  {listing.status === 'Closed' ? (
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
                  {listing.urgent && (
                    <span className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-semibold bg-primary-500/20 border border-primary-500/40 text-primary-300 shadow-sm">
                      <span>🔥</span>
                      <span>Итно</span>
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={handleToggleFavorite}
                disabled={!!(user && listing.user && user.id === listing.user.id)}
                className={`w-full sm:w-auto px-6 py-3 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2 ${
                  user && listing.user && user.id === listing.user.id
                    ? 'bg-bg-darker text-gray-500 cursor-not-allowed opacity-60'
                    : isFavorite
                      ? 'bg-gradient-to-r from-gray-600 to-gray-700 text-white hover:shadow-lg hover:from-gray-700 hover:to-gray-800 border border-primary-500/20 hover:border-primary-500/30 transform hover:-translate-y-0.5'
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
            </div>
          </div>
        </div>

        <div className="border-t border-primary-500/20 my-6"></div>

        <div className="grid grid-cols-1 lg:grid-cols-[65%_35%] gap-6 md:gap-8">
          <div className="space-y-6">
            {vehicle && (
              <div className="bg-bg-light p-4 md:p-6 rounded-xl border border-primary-500/20">
                <h2 className="text-xl md:text-2xl font-bold mb-4 text-white">Карактеристики</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <span className="text-primary-400 font-semibold">Марка:</span>
                    <span className="ml-2 font-semibold text-gray-300">
                      {vehicle.brand?.name || ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-primary-400 font-semibold">Модел:</span>
                    <span className="ml-2 font-semibold text-gray-300">
                      {vehicle.model?.name || ''}
                    </span>
                  </div>
                  <div>
                    <span className="text-primary-400 font-semibold">Година:</span>
                    <span className="ml-2 font-semibold text-gray-300">{vehicle.year}</span>
                  </div>
                  {vehicle.engine_displ_l && (
                    <div>
                      <span className="text-primary-400 font-semibold">Мотор (л):</span>
                      <span className="ml-2 font-semibold text-gray-300">
                        {formatEngineVolume(vehicle.engine_displ_l)}
                      </span>
                    </div>
                  )}
                  {vehicle.mileage_km && (
                    <div>
                      <span className="text-primary-400 font-semibold">Поминување:</span>
                      <span className="ml-2 font-semibold text-gray-300">
                        {formatMileage(vehicle.mileage_km)} км
                      </span>
                    </div>
                  )}
                  {vehicle.fuel && (
                    <div>
                      <span className="text-primary-400 font-semibold">Гориво:</span>
                      <span className="ml-2 font-semibold text-gray-300">{vehicle.fuel}</span>
                    </div>
                  )}
                  {vehicle.transmission && (
                    <div>
                      <span className="text-primary-400 font-semibold">Пренос:</span>
                      <span className="ml-2 font-semibold text-gray-300">
                        {formatTransmission(vehicle.transmission)}
                      </span>
                    </div>
                  )}
                  {vehicle.body_type && (
                    <div>
                      <span className="text-primary-400 font-semibold">Тип на каросерија:</span>
                      <span className="ml-2 font-semibold text-gray-300">
                        {formatBodyType(vehicle.body_type)}
                      </span>
                    </div>
                  )}
                  {vehicle.color && (
                    <div>
                      <span className="text-primary-400 font-semibold">Боја:</span>
                      <span className="ml-2 font-semibold text-gray-300">{vehicle.color}</span>
                    </div>
                  )}
                  {vehicle.doors && (
                    <div>
                      <span className="text-primary-400 font-semibold">Врати:</span>
                      <span className="ml-2 font-semibold text-gray-300">{vehicle.doors}</span>
                    </div>
                  )}
                  {listing.vin && (
                    <div className="flex items-center gap-2">
                      <span className="text-primary-400 font-semibold">VIN:</span>
                      <span className="ml-2 font-semibold text-gray-300">{listing.vin}</span>
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

            {listing.description && (
              <div className="bg-bg-light p-4 md:p-6 rounded-xl border border-primary-500/20">
                <h2 className="text-xl md:text-2xl font-bold mb-4 text-primary-400">Опис</h2>
                <div
                  className="text-gray-300 leading-relaxed prose prose-invert prose-headings:text-white prose-p:text-gray-300 prose-strong:text-white prose-em:text-gray-200 max-w-none"
                  dangerouslySetInnerHTML={{ __html: listing.description }}
                />
              </div>
            )}

            {listing.vin && (
              <div className="bg-bg-light p-4 md:p-6 rounded-xl border border-primary-500/20">
                <div className="mb-4">
                  <h3 className="text-lg font-bold mb-2 text-white">
                    Претходни објави за ова возило
                  </h3>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    💡 Прикажуваме претходни објави за ова возило со ист VIN. За заштита на
                    приватност, цената и личните податоци на авторите се скриени за затворени
                    објави.
                  </p>
                </div>
                {loadingPrevious ? (
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
                            <td className="py-3 px-2 sm:px-3 text-gray-400 text-xs sm:text-sm hidden sm:table-cell">
                              {prevListing.vehicle?.mileage_km
                                ? formatMileage(prevListing.vehicle.mileage_km) + ' км'
                                : '-'}
                            </td>
                            <td className="py-3 px-2 sm:px-3 text-gray-400 text-xs sm:text-sm hidden md:table-cell">
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
                  <p className="text-gray-400 text-sm">Нема претходни објави за ова возило</p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-bg-light p-4 md:p-6 rounded-xl border border-primary-500/20">
              <h2 className="text-xl md:text-2xl font-bold mb-4 text-white">
                Контактни информации
              </h2>
              {listing.user && (
                <div className="space-y-4">
                  <div>
                    <span className="font-semibold text-primary-400">Тип на продавач:</span>{' '}
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-lg text-sm font-semibold ml-2 ${
                        listing.user.type === 'Business'
                          ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          : 'bg-green-500/20 text-green-300 border border-green-500/30'
                      }`}
                    >
                      {listing.user.type === 'Business' ? 'Правно лице' : 'Физичко лице'}
                    </span>
                  </div>

                  {listing.status !== 'Closed' &&
                    listing.user.type === 'Business' &&
                    listing.user.companyName && (
                      <div>
                        <span className="font-semibold text-primary-400">Компанија:</span>{' '}
                        <span className="text-gray-300">{listing.user.companyName}</span>
                      </div>
                    )}

                  {listing.status !== 'Closed' && listing.user.type === 'Individual' && (
                    <>
                      {listing.user.firstName && listing.user.lastName && (
                        <div>
                          <span className="font-semibold text-primary-400">Име:</span>{' '}
                          <span className="text-gray-300">
                            {listing.user.firstName} {listing.user.lastName}
                          </span>
                        </div>
                      )}
                    </>
                  )}

                  <div>
                    <span className="font-semibold text-primary-400">Град:</span>{' '}
                    <span className="text-gray-300">{listing.city}</span>
                  </div>

                  {listing.status === 'Closed' ? (
                    <div>
                      <span className="font-semibold text-primary-400">Телефон:</span>{' '}
                      <span className="text-primary-400">••••••••</span>
                    </div>
                  ) : (
                    listing.user.phone && (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-primary-400">Телефон:</span>{' '}
                        <a
                          href={`tel:${listing.user.phone}`}
                          className="text-gray-300 hover:text-primary-300 transition-colors underline"
                        >
                          {listing.user.phone}
                        </a>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleCopy(listing.user!.phone!, 'Телефон');
                          }}
                          className="ml-1 p-1.5 text-primary-400 hover:text-primary-300 hover:bg-primary-500/10 rounded transition-colors"
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

                  {listing.status === 'Closed' ? (
                    <div>
                      <span className="font-semibold text-primary-400">Email:</span>{' '}
                      <span className="text-primary-400">••••••••</span>
                    </div>
                  ) : (
                    listing.user.email && (
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-primary-400">Email:</span>{' '}
                        <a
                          href={`mailto:${listing.user.email}`}
                          className="text-gray-300 hover:text-primary-300 transition-colors underline"
                        >
                          {listing.user.email}
                        </a>
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleCopy(listing.user!.email!, 'Email');
                          }}
                          className="ml-1 p-1.5 text-primary-400 hover:text-primary-300 hover:bg-primary-500/10 rounded transition-colors"
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

                  {(listing.user.viber || listing.user.whatsapp || listing.user.telegram) && (
                    <div>
                      <span className="font-semibold text-primary-400 mb-2 block">
                        Достапни месенџери:
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {listing.user.viber && (
                          <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            Viber
                          </span>
                        )}
                        {listing.user.whatsapp && (
                          <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-green-500/20 text-green-300 border border-green-500/30">
                            WhatsApp
                          </span>
                        )}
                        {listing.user.telegram && (
                          <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            Telegram
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {listing.user && (
                    <div className="pt-2 border-t border-primary-500/20">
                      <button
                        onClick={() => setIsUserListingsModalOpen(true)}
                        disabled={listing.status === 'Closed'}
                        className={`text-sm font-medium flex items-start gap-2 transition-colors w-full text-left ${
                          listing.status === 'Closed'
                            ? 'text-gray-500 cursor-not-allowed opacity-50'
                            : 'text-primary-400 hover:text-primary-300'
                        }`}
                        title={listing.status === 'Closed' ? 'Недостапно за затворени објави' : ''}
                      >
                        <svg
                          className="w-4 h-4 flex-shrink-0 mt-0.5"
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
                        <span className="flex-1 break-words">
                          Погледни сите активни објави од овој продавач
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-bg-light p-4 md:p-6 rounded-xl border border-primary-500/20">
              <div className="flex items-center gap-2 text-sm text-gray-300 mb-3">
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
                <span>{formatDate(listing.last_updated_at)}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-300">
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
                <span>{formatDate(closingDate)}</span>
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
            className="absolute top-2 right-2 sm:top-4 sm:right-4 text-white hover:text-gray-300 transition-colors z-10 p-2"
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
                className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-colors z-10 bg-black bg-opacity-50 rounded-full p-2 sm:p-3"
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
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  nextImage();
                }}
                className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-colors z-10 bg-black bg-opacity-50 rounded-full p-2 sm:p-3"
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
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </>
          )}

          <div
            className="relative max-w-7xl w-full h-full flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            {images[modalImageIndex] && images[modalImageIndex] !== '/placeholder-car.jpg' ? (
              <Image
                src={images[modalImageIndex]}
                alt={`${listing.title} - ${modalImageIndex + 1}`}
                width={1200}
                height={900}
                className="max-w-full max-h-[90vh] w-auto h-auto object-contain"
                unoptimized
              />
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
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white text-sm bg-black bg-opacity-50 px-4 py-2 rounded-full">
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
