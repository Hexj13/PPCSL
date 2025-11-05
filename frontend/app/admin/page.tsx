'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';

import { Dropdown } from '@/components/Dropdown';
import { ListingManagementCard } from '@/components/ListingManagementCard';
import { UserListingsModal } from '@/components/UserListingsModal';
import { adminApi, Listing, User } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

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

  const handleAction = async (id: string, action: 'publish' | 'pause' | 'close') => {
    try {
      const statusMap: Record<'publish' | 'pause' | 'close', 'Active' | 'Paused' | 'Closed'> = {
        publish: 'Active',
        pause: 'Paused',
        close: 'Closed',
      };
      await adminApi.updateListingStatus(id, statusMap[action]);
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
        <div className="space-y-4">
          {filteredListings.map((listing) => (
            <ListingManagementCard
              key={listing.id}
              listing={listing}
              mode="admin"
              onAction={handleAction}
              onCopyId={(id) => handleCopy(id, 'ID')}
            />
          ))}
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
      const idMatch = user.id?.toLowerCase().includes(searchLower);
      const emailMatch = user.email?.toLowerCase().includes(searchLower);
      const phoneMatch = user.phone?.toLowerCase().includes(searchLower);
      const firstNameMatch = user.firstName?.toLowerCase().includes(searchLower);
      const lastNameMatch = user.lastName?.toLowerCase().includes(searchLower);
      const companyMatch = user.companyName?.toLowerCase().includes(searchLower);
      return (
        roleMatch &&
        (idMatch || emailMatch || phoneMatch || firstNameMatch || lastNameMatch || companyMatch)
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
          placeholder="Пребарај по ID, email, телефон, име, презиме или компанија"
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
