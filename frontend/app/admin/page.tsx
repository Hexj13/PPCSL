'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { adminApi, Listing, User } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import {
  formatPrice,
  formatEngineVolume,
  formatMileage,
  formatTransmission,
  formatBodyType,
  getOptimizedImageUrl,
} from '@/lib/utils';
import { Dropdown } from '@/components/Dropdown';
import { UserListingsModal } from '@/components/UserListingsModal';
import toast from 'react-hot-toast';

type AdminTab = 'listings' | 'users';

export default function AdminPage() {
  const router = useRouter();
  const { user, isInitialized } = useAuthStore();
  const [activeTab, setActiveTab] = useState<AdminTab>('listings');

  useEffect(() => {
    if (!isInitialized) return;

    if (!user) {
      router.push('/login');
      return;
    }

    if (user.type !== 'Admin') {
      router.push('/');
      return;
    }
  }, [user, isInitialized, router]);

  if (!isInitialized) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <p className="mt-4 text-gray-300">Вчитување...</p>
      </div>
    );
  }

  if (!user || user.type !== 'Admin') {
    return null;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
        <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent">
          Админ панел
        </h1>
      </div>

      <div className="mb-6">
        <div className="flex gap-3 border-b border-primary-500/20">
          <button
            onClick={() => setActiveTab('listings')}
            className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
              activeTab === 'listings'
                ? 'border-primary-500 text-primary-500'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            Објави
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
              activeTab === 'users'
                ? 'border-primary-500 text-primary-500'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            Корисници
          </button>
        </div>
      </div>

      {activeTab === 'listings' && <ListingsTab />}
      {activeTab === 'users' && <UsersTab />}
    </div>
  );
}

function ListingsTab() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Paused' | 'Closed'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'creator' | 'id'>('creator');

  useEffect(() => {
    loadListings();
  }, []);

  const loadListings = async () => {
    try {
      const res = await adminApi.getAllListings();
      setListings(res.data);
    } catch {
      toast.error('Грешка при вчитување на објави');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, status: 'Active' | 'Paused' | 'Closed') => {
    try {
      await adminApi.updateListingStatus(id, status);
      toast.success('Статусот е успешно ажуриран');
      loadListings();
    } catch {
      toast.error('Грешка при ажурирање на статус');
    }
  };

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} е копирано`);
    } catch (err) {
      toast.error('Грешка при копирање');
    }
  };

  const filteredListings = listings.filter((listing) => {
    const statusMatch = statusFilter === 'All' || listing.status === statusFilter;

    if (searchQuery.trim()) {
      if (searchType === 'id') {
        const idMatch = listing.id.toLowerCase().includes(searchQuery.toLowerCase());
        return statusMatch && idMatch;
      } else {
        const user = listing.user;
        if (!user) return false;
        const creatorName =
          `${user.firstName || ''} ${user.lastName || ''} ${user.email || ''} ${user.companyName || ''}`.toLowerCase();
        const nameMatch = creatorName.includes(searchQuery.toLowerCase());
        return statusMatch && nameMatch;
      }
    }

    return statusMatch;
  });

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <p className="mt-4 text-gray-300">Вчитување...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-row gap-4 items-center">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={
            searchType === 'id' ? 'Внесете ID на објава' : 'Внесете име, email или компанија'
          }
          className="flex-1 px-4 py-3 rounded-lg bg-bg-light border-2 border-primary-500/30 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 h-[48px]"
        />
        <Dropdown
          value={searchType}
          onChange={(value) => setSearchType(value as 'creator' | 'id')}
          options={[
            { value: 'creator', label: 'Пребарај по корисник' },
            { value: 'id', label: 'Пребарај по ID' },
          ]}
          className="w-auto min-w-[200px]"
        />
      </div>

      <div className="mb-6">
        <div className="flex flex-wrap gap-3">
          {(['All', 'Active', 'Paused', 'Closed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-primary-600 text-white'
                  : 'bg-bg-light text-gray-300 hover:bg-bg-dark border border-primary-500/20'
              }`}
            >
              {status === 'All'
                ? 'Сите'
                : status === 'Active'
                  ? 'Активни'
                  : status === 'Paused'
                    ? 'Привремено застарени'
                    : 'Затворени'}
              {status !== 'All' && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-primary-500/20 text-xs">
                  {listings.filter((l) => l.status === status).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 text-gray-300">
        Вкупно објави: <span className="font-semibold text-white">{filteredListings.length}</span>
      </div>

      {filteredListings.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-300 text-lg">Нема објави</p>
        </div>
      ) : (
        <div className="space-y-4" style={{ overflow: 'visible' }}>
          {filteredListings.map((listing) => {
            const imageUrl =
              listing.images && listing.images.length > 0 && listing.images[0]
                ? listing.images[0]
                : '/placeholder-car.jpg';
            const hasImage = imageUrl && imageUrl !== '/placeholder-car.jpg';

            return (
              <div key={listing.id} className="card" style={{ overflow: 'visible' }}>
                <div
                  className="grid grid-cols-1 md:grid-cols-[350px_1fr] gap-0 md:gap-6 md:items-stretch"
                  style={{ overflow: 'visible' }}
                >
                  <Link href={`/listings/${listing.id}`} className="flex-shrink-0">
                    <div className="relative w-full h-[300px] md:h-full md:min-h-[320px] bg-bg-darker">
                      {hasImage ? (
                        <Image
                          src={getOptimizedImageUrl(imageUrl, 65, 600)}
                          alt={listing.title}
                          fill
                          className="object-cover"
                          sizes="(max-width: 768px) 100vw, 300px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-200">
                          <svg
                            className="w-16 h-16"
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
                  </Link>
                  <div className="flex-1 p-5 flex flex-col relative">
                    <div className="mb-3">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <span className="text-xs text-gray-400 font-mono">
                              ID: {listing.id}
                            </span>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                handleCopy(listing.id, 'ID');
                              }}
                              className="p-1 text-primary-400 hover:text-primary-300 hover:bg-primary-500/10 rounded transition-colors"
                              title="Копирај ID"
                            >
                              <svg
                                className="w-3.5 h-3.5"
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
                          <Link href={`/listings/${listing.id}`}>
                            <h3 className="font-bold text-lg md:text-xl mb-1.5 hover:text-primary-600 transition-colors line-clamp-2">
                              {listing.title}
                            </h3>
                          </Link>
                        </div>
                        <div className="bg-bg-dark/95 backdrop-blur-sm px-2 py-2 rounded-lg border border-primary-500/30 inline-flex items-center gap-1.5 flex-shrink-0">
                          <div className="text-xs font-semibold text-gray-200">Статус:</div>
                          <div
                            className={
                              listing.status === 'Active'
                                ? 'text-green-400 font-bold text-sm'
                                : listing.status === 'Paused'
                                  ? 'text-yellow-400 font-bold text-sm'
                                  : 'text-gray-200 font-bold text-sm'
                            }
                          >
                            {listing.status === 'Active'
                              ? 'Активна'
                              : listing.status === 'Paused'
                                ? 'Привремено застарена'
                                : 'Затворена'}
                          </div>
                        </div>
                      </div>
                      {listing.user && (
                        <div className="mb-2 text-sm text-gray-300">
                          <span className="text-primary-400">Корисник:</span>{' '}
                          <span className="font-medium">
                            {listing.user.email}
                            {listing.user.firstName && listing.user.lastName && (
                              <>
                                {' '}
                                ({listing.user.firstName} {listing.user.lastName})
                              </>
                            )}
                            {listing.user.companyName && <> ({listing.user.companyName})</>}
                          </span>
                        </div>
                      )}
                      <div className="mb-2">
                        <div className="flex items-baseline gap-2">
                          <span className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent">
                            {formatPrice(listing.price, listing.currency)}
                          </span>
                          <span className="text-sm text-gray-200 font-medium">
                            {listing.currency}
                          </span>
                        </div>
                        {listing.urgent && (
                          <div className="mt-1.5">
                            <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold bg-primary-500/20 border border-primary-500/40 text-primary-300 shadow-sm">
                              <span>🔥</span>
                              <span>Итно</span>
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    {listing.vehicle && (
                      <div className="mb-3 flex-1">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2.5 text-sm">
                          {listing.vehicle.brand && listing.vehicle.model && (
                            <div>
                              <span className="text-primary-400">Бренд/Модел:</span>
                              <span className="ml-2 font-medium text-gray-200">
                                {listing.vehicle.brand.name} {listing.vehicle.model.name}
                              </span>
                            </div>
                          )}
                          {listing.vehicle.year && (
                            <div>
                              <span className="text-primary-400">Година:</span>
                              <span className="ml-2 font-medium text-gray-200">
                                {listing.vehicle.year}
                              </span>
                            </div>
                          )}
                          {listing.vehicle.engine_displ_l && (
                            <div>
                              <span className="text-primary-400">Мотор (л):</span>
                              <span className="ml-2 font-medium text-gray-200">
                                {formatEngineVolume(listing.vehicle.engine_displ_l)}
                              </span>
                            </div>
                          )}
                          {listing.vehicle.mileage_km && (
                            <div>
                              <span className="text-primary-400">Поминување:</span>
                              <span className="ml-2 font-medium text-gray-200">
                                {formatMileage(listing.vehicle.mileage_km)} км
                              </span>
                            </div>
                          )}
                          {listing.vehicle.fuel && (
                            <div>
                              <span className="text-primary-400">Гориво:</span>
                              <span className="ml-2 font-medium text-gray-200">
                                {listing.vehicle.fuel}
                              </span>
                            </div>
                          )}
                          {listing.vehicle.transmission && (
                            <div>
                              <span className="text-primary-400">Пренос:</span>
                              <span className="ml-2 font-medium text-gray-200">
                                {formatTransmission(listing.vehicle.transmission)}
                              </span>
                            </div>
                          )}
                          {listing.vehicle.body_type && (
                            <div>
                              <span className="text-primary-400">Тип:</span>
                              <span className="ml-2 font-medium text-gray-200">
                                {formatBodyType(listing.vehicle.body_type)}
                              </span>
                            </div>
                          )}
                          {listing.vehicle.color && (
                            <div>
                              <span className="text-primary-400">Боја:</span>
                              <span className="ml-2 font-medium text-gray-200">
                                {listing.vehicle.color}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="mt-auto pt-3 border-t border-primary-500/20">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div className="text-sm text-gray-200 font-medium">{listing.city}</div>
                        <div className="flex gap-2 flex-wrap relative">
                          <Dropdown
                            value={listing.status}
                            onChange={(value) =>
                              handleStatusChange(
                                listing.id,
                                value as 'Active' | 'Paused' | 'Closed'
                              )
                            }
                            options={[
                              { value: 'Active', label: 'Активна' },
                              { value: 'Paused', label: 'Привремено застарена' },
                              { value: 'Closed', label: 'Затворена' },
                            ]}
                            className="w-48"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'All' | 'Individual' | 'Business' | 'Admin'>('All');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showListingsModal, setShowListingsModal] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const res = await adminApi.getAllUsers();
      setUsers(res.data);
    } catch {
      toast.error('Грешка при вчитување на корисници');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (userId: string) => {
    try {
      await adminApi.toggleUserStatus(userId);
      toast.success('Статусот на корисникот е ажуриран');
      loadUsers();
    } catch {
      toast.error('Грешка при ажурирање на статус');
    }
  };

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} е копирано`);
    } catch (err) {
      toast.error('Грешка при копирање');
    }
  };

  const handleViewListings = (user: User) => {
    setSelectedUser(user);
    setShowListingsModal(true);
  };

  const fetchUserListings = useCallback(async (userId: string): Promise<Listing[]> => {
    try {
      const res = await adminApi.getUserListings(userId);
      return res.data;
    } catch {
      toast.error('Грешка при вчитување на објави');
      return [];
    }
  }, []);

  const filteredUsers = users.filter((user) => {
    const roleMatch = roleFilter === 'All' || user.type === roleFilter;

    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase();
      const emailMatch = user.email?.toLowerCase().includes(searchLower);
      const phoneMatch = user.phone?.toLowerCase().includes(searchLower);
      const firstNameMatch = user.firstName?.toLowerCase().includes(searchLower);
      const lastNameMatch = user.lastName?.toLowerCase().includes(searchLower);
      const companyMatch = user.companyName?.toLowerCase().includes(searchLower);
      return (
        roleMatch && (emailMatch || phoneMatch || firstNameMatch || lastNameMatch || companyMatch)
      );
    }

    return roleMatch;
  });

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <p className="mt-4 text-gray-300">Вчитување...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-row gap-4 items-center">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Пребарај по email, телефон, име или компанија"
          className="flex-1 px-4 py-3 rounded-lg bg-bg-light border-2 border-primary-500/30 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 h-[48px]"
        />
        <Dropdown
          value={roleFilter}
          onChange={(value) => setRoleFilter(value as typeof roleFilter)}
          options={[
            { value: 'All', label: 'Сите роли' },
            { value: 'Individual', label: 'Физичко лице' },
            { value: 'Business', label: 'Правно лице' },
            { value: 'Admin', label: 'Админ' },
          ]}
          className="w-48"
        />
      </div>

      <div className="mb-4 text-gray-300">
        Вкупно корисници: <span className="font-semibold text-white">{filteredUsers.length}</span>
      </div>

      {filteredUsers.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-300 text-lg">Нема корисници</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredUsers.map((user) => (
            <div key={user.id} className="card p-5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <div className="mb-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-gray-400 font-mono">ID: {user.id}</span>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          handleCopy(user.id, 'ID');
                        }}
                        className="p-1 text-primary-400 hover:text-primary-300 hover:bg-primary-500/10 rounded transition-colors"
                        title="Копирај ID"
                      >
                        <svg
                          className="w-3.5 h-3.5"
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
                    <h3 className="text-xl font-bold text-white">
                      {user.firstName && user.lastName
                        ? `${user.firstName} ${user.lastName}`
                        : user.companyName || user.email}
                    </h3>
                    {user.companyName && (
                      <p className="text-sm text-gray-300 mt-1">{user.companyName}</p>
                    )}
                  </div>
                  <div className="space-y-1 text-sm text-gray-300">
                    <div>
                      <span className="text-primary-400">Email:</span> {user.email}
                    </div>
                    {user.phone && (
                      <div>
                        <span className="text-primary-400">Телефон:</span> {user.phone}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <span className="text-primary-400">Тип:</span>
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          user.type === 'Admin'
                            ? 'bg-purple-500/20 text-purple-300'
                            : user.type === 'Business'
                              ? 'bg-blue-500/20 text-blue-300'
                              : 'bg-green-500/20 text-green-300'
                        }`}
                      >
                        {user.type === 'Admin'
                          ? 'Админ'
                          : user.type === 'Business'
                            ? 'Правно лице'
                            : 'Физичко лице'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-primary-400">Статус:</span>
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          user.active !== false
                            ? 'bg-green-500/20 text-green-300'
                            : 'bg-red-500/20 text-red-300'
                        }`}
                      >
                        {user.active !== false ? 'Активен' : 'Деактивиран'}
                      </span>
                    </div>
                    <div>
                      <span className="text-primary-400">Објави:</span> {user.listings?.length || 0}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {(user.listings?.length || 0) > 0 && (
                    <button
                      onClick={() => handleViewListings(user)}
                      className="px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-lg font-medium transition-colors bg-primary-700 hover:bg-primary-800 text-white text-center w-full sm:w-auto"
                    >
                      Види објави ({user.listings?.length || 0})
                    </button>
                  )}
                  <button
                    onClick={() => handleToggleStatus(user.id)}
                    className={`px-3 sm:px-4 py-2 text-xs sm:text-sm rounded-lg font-medium transition-colors text-center w-full sm:w-auto ${
                      user.active !== false
                        ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30'
                        : 'bg-green-500/20 text-green-300 hover:bg-green-500/30 border border-green-500/30'
                    }`}
                  >
                    {user.active !== false ? 'Деактивирај' : 'Активирај'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <UserListingsModal
        isOpen={showListingsModal}
        onClose={() => {
          setShowListingsModal(false);
          setSelectedUser(null);
        }}
        user={selectedUser}
        showOnlyActive={false}
        fetchListings={fetchUserListings}
      />
    </div>
  );
}
