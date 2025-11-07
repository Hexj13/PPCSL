'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';

import { Dropdown } from '@/components/Dropdown';
import { ListingManagementCard } from '@/components/ListingManagementCard';
import { ListingManagementCardSkeleton } from '@/components/ListingManagementCardSkeleton';
import { UserListingsModal } from '@/components/UserListingsModal';
import { adminApi, Listing, PaginationMeta, User } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

type AdminTab = 'listings' | 'users';

export default function AdminPage() {
  const router = useRouter();
  const { user, isInitialized } = useAuthStore();
  const [activeTab, setActiveTab] = useState<AdminTab>('listings');

  useEffect(() => {
    if (!isInitialized && !user) {
      return;
    }

    if (isInitialized && !user) {
      router.push('/login');
      return;
    }

    if (user && user.type !== 'Admin') {
      router.push('/');
      return;
    }
  }, [user, isInitialized, router]);

  if (!isInitialized && !user) {
    return null;
  }

  if (isInitialized && !user) {
    return null;
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
  const [allListings, setAllListings] = useState<Listing[]>([]);
  const [displayedCount, setDisplayedCount] = useState(20);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Paused' | 'Closed'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<'creator' | 'id'>('creator');
  const loadingRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const prevStatusFilterRef = useRef(statusFilter);
  const prevSearchTypeRef = useRef(searchType);
  const prevSearchQueryRef = useRef(searchQuery);
  const fetchInProgressRef = useRef(false);
  const showLoadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchListings = useCallback(
    async (
      page: number,
      append: boolean = false,
      limit: number = 20,
      forceReload: boolean = false
    ) => {
      if (fetchInProgressRef.current) {
        return;
      }
      if (append && loadingMoreRef.current) {
        return;
      }
      if (!append && loadingRef.current && !forceReload) {
        return;
      }

      fetchInProgressRef.current = true;

      if (append) {
        setLoadingMore(true);
        loadingMoreRef.current = true;
      } else {
        const hasExistingData = allListings.length > 0;
        if (!hasExistingData) {
          setLoading(true);
          loadingRef.current = true;
        } else {
          showLoadingTimeoutRef.current = setTimeout(() => {
            setLoading(true);
            loadingRef.current = true;
          }, 300);
        }
      }

      try {
        const res = await adminApi.getAllListings(1, 10000);
        const responseData = res.data;

        let allListings: Listing[] = [];
        let responseMeta: PaginationMeta | null = null;

        if (Array.isArray(responseData)) {
          allListings = responseData;
          const total = allListings.length;
          const totalPages = Math.ceil(total / limit);
          responseMeta = {
            total,
            page,
            limit,
            totalPages,
          };
        } else if (responseData && typeof responseData === 'object') {
          allListings = responseData.data || [];
          responseMeta = responseData.meta || null;
        }

        if (append) {
          setDisplayedCount((prev) => prev + limit);
          setCurrentPage(page);
        } else {
          setAllListings(allListings);
          setDisplayedCount(limit);
          setCurrentPage(1);
        }
        setMeta(responseMeta);
      } catch {
        toast.error('Грешка при вчитување на објави');
        if (!append) {
          setAllListings([]);
          setDisplayedCount(20);
        }
      } finally {
        if (showLoadingTimeoutRef.current) {
          clearTimeout(showLoadingTimeoutRef.current);
          showLoadingTimeoutRef.current = null;
        }
        setLoadingMore(false);
        loadingMoreRef.current = false;
        setLoading(false);
        loadingRef.current = false;
        fetchInProgressRef.current = false;
      }
    },
    [allListings.length]
  );

  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      fetchListings(1, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hasInitializedRef.current) return;
    if (prevStatusFilterRef.current === statusFilter && prevSearchTypeRef.current === searchType)
      return;

    prevStatusFilterRef.current = statusFilter;
    prevSearchTypeRef.current = searchType;
    setCurrentPage(1);
    fetchListings(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, searchType]);

  useEffect(() => {
    if (!hasInitializedRef.current) return;
    if (prevSearchQueryRef.current === searchQuery) return;

    const timer = setTimeout(() => {
      prevSearchQueryRef.current = searchQuery;
      setCurrentPage(1);
      fetchListings(1, false);
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const handleAction = useCallback(async (id: string, action: 'publish' | 'pause' | 'close') => {
    const statusMap: Record<'publish' | 'pause' | 'close', 'Active' | 'Paused' | 'Closed'> = {
      publish: 'Active',
      pause: 'Paused',
      close: 'Closed',
    };
    const newStatus = statusMap[action];

    try {
      await adminApi.updateListingStatus(id, newStatus);
      toast.success('Статусот е успешно ажуриран');

      setAllListings((prev) =>
        prev.map((listing) => (listing.id === id ? { ...listing, status: newStatus } : listing))
      );
    } catch {
      toast.error('Грешка при ажурирање на статус');
    }
  }, []);

  const handleCopy = useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} е копирано`);
    } catch {
      toast.error('Грешка при копирање');
    }
  }, []);

  const filteredListings = useMemo(() => {
    return allListings.filter((listing) => {
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
  }, [allListings, statusFilter, searchQuery, searchType]);

  const displayedListings = useMemo(() => {
    return filteredListings.slice(0, displayedCount);
  }, [filteredListings, displayedCount]);

  const statusCounts = useMemo(() => {
    return {
      Active: allListings.filter((l) => l.status === 'Active').length,
      Paused: allListings.filter((l) => l.status === 'Paused').length,
      Closed: allListings.filter((l) => l.status === 'Closed').length,
    };
  }, [allListings]);

  const handleLoadMore = useCallback(() => {
    if (loadingMore) {
      return;
    }

    const filteredCount = filteredListings.length;

    if (displayedCount >= filteredCount) {
      return;
    }

    setLoadingMore(true);
    setTimeout(() => {
      setDisplayedCount((prev) => Math.min(prev + 20, filteredCount));
      setCurrentPage((prev) => prev + 1);
      setLoadingMore(false);
    }, 100);
  }, [loadingMore, filteredListings.length, displayedCount]);

  if (loading) {
    return (
      <div>
        <div className="mb-6 flex flex-row gap-4 items-center">
          <div className="flex-1 h-[48px] bg-bg-light/30 rounded-lg animate-pulse" />
          <div className="w-auto min-w-[200px] h-[48px] bg-bg-light/30 rounded-lg animate-pulse" />
        </div>
        <div className="mb-6">
          <div className="flex flex-wrap gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 w-24 bg-bg-light/30 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
        <div className="mb-4 h-5 bg-bg-light/30 rounded w-48 animate-pulse" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <ListingManagementCardSkeleton key={i} />
          ))}
        </div>
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
                  {statusCounts[status]}
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
        <>
          <div className="space-y-4">
            {displayedListings.map((listing) => (
              <ListingManagementCard
                key={listing.id}
                listing={listing}
                mode="admin"
                onAction={handleAction}
                onCopyId={(id) => handleCopy(id, 'ID')}
              />
            ))}
          </div>

          {loadingMore && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <p className="mt-2 text-gray-300">Вчитување...</p>
            </div>
          )}

          {!loadingMore && (
            <>
              {displayedCount < filteredListings.length ? (
                <div className="text-center py-8">
                  <button
                    onClick={handleLoadMore}
                    className="btn-primary px-8 py-3 text-lg font-semibold"
                  >
                    Вчитај уште
                  </button>
                </div>
              ) : displayedCount >= filteredListings.length && filteredListings.length > 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-300">Нема повеќе објави</p>
                </div>
              ) : null}
            </>
          )}
        </>
      )}
    </div>
  );
}

function UsersTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'All' | 'Individual' | 'Business' | 'Admin'>('All');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showListingsModal, setShowListingsModal] = useState(false);
  const loadingRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const prevRoleFilterRef = useRef(roleFilter);
  const prevSearchQueryRef = useRef(searchQuery);
  const fetchInProgressRef = useRef(false);
  const showLoadingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchUsers = useCallback(
    async (page: number, append: boolean = false, limit: number = 20) => {
      if (fetchInProgressRef.current) {
        return;
      }
      if (append && loadingMoreRef.current) {
        return;
      }
      if (!append && loadingRef.current) {
        return;
      }

      fetchInProgressRef.current = true;

      if (append) {
        setLoadingMore(true);
        loadingMoreRef.current = true;
      } else {
        const hasExistingData = users.length > 0;
        if (!hasExistingData) {
          setLoading(true);
          loadingRef.current = true;
        } else {
          showLoadingTimeoutRef.current = setTimeout(() => {
            setLoading(true);
            loadingRef.current = true;
          }, 300);
        }
      }

      try {
        const res = await adminApi.getAllUsers(page, limit);
        const responseData = res.data;

        let newUsers: User[] = [];
        let responseMeta: PaginationMeta | null = null;

        if (Array.isArray(responseData)) {
          newUsers = responseData.slice((page - 1) * limit, page * limit);
          const total = responseData.length;
          const totalPages = Math.ceil(total / limit);
          responseMeta = {
            total,
            page,
            limit,
            totalPages,
          };
        } else if (responseData && typeof responseData === 'object') {
          newUsers = responseData.data || [];
          responseMeta = responseData.meta || null;
        }

        if (append) {
          setUsers((prev) => {
            const existingIds = new Set(prev.map((u) => u.id));
            const uniqueNewUsers = newUsers.filter((u) => !existingIds.has(u.id));
            return [...prev, ...uniqueNewUsers];
          });
          setCurrentPage(page);
        } else {
          setUsers(newUsers);
          setCurrentPage(page);
        }
        setMeta(responseMeta);
      } catch {
        toast.error('Грешка при вчитување на корисници');
        if (!append) {
          setUsers([]);
        }
      } finally {
        if (showLoadingTimeoutRef.current) {
          clearTimeout(showLoadingTimeoutRef.current);
          showLoadingTimeoutRef.current = null;
        }
        setLoadingMore(false);
        loadingMoreRef.current = false;
        setLoading(false);
        loadingRef.current = false;
        fetchInProgressRef.current = false;
      }
    },
    [users.length]
  );

  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      fetchUsers(1, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hasInitializedRef.current) return;
    if (prevRoleFilterRef.current === roleFilter) return;

    prevRoleFilterRef.current = roleFilter;
    setCurrentPage(1);
    fetchUsers(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roleFilter]);

  useEffect(() => {
    if (!hasInitializedRef.current) return;
    if (prevSearchQueryRef.current === searchQuery) return;

    const timer = setTimeout(() => {
      prevSearchQueryRef.current = searchQuery;
      setCurrentPage(1);
      fetchUsers(1, false);
    }, 500);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const handleLoadMore = useCallback(async () => {
    if (loadingMore) {
      return;
    }

    if (meta && meta.totalPages) {
      if (currentPage >= meta.totalPages) {
        return;
      }
    }

    const nextPage = currentPage + 1;
    await fetchUsers(nextPage, true, 20);
  }, [loadingMore, meta, currentPage, fetchUsers]);

  const handleToggleStatus = useCallback(
    async (userId: string) => {
      const user = users.find((u) => u.id === userId);
      const previousActive = user?.active;

      setUsers((prev) =>
        prev.map((user) =>
          user.id === userId ? { ...user, active: user.active === false ? true : false } : user
        )
      );

      try {
        await adminApi.toggleUserStatus(userId);
        toast.success('Статусот на корисникот е ажуриран');
      } catch {
        if (previousActive !== undefined) {
          setUsers((prev) =>
            prev.map((user) => (user.id === userId ? { ...user, active: previousActive } : user))
          );
        }
        toast.error('Грешка при ажурирање на статус');
      }
    },
    [users]
  );

  const handleCopy = useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} е копирано`);
    } catch {
      toast.error('Грешка при копирање');
    }
  }, []);

  const handleViewListings = useCallback((user: User) => {
    setSelectedUser(user);
    setShowListingsModal(true);
  }, []);

  const fetchUserListings = useCallback(async (userId: string): Promise<Listing[]> => {
    try {
      const res = await adminApi.getUserListings(userId);
      return res.data;
    } catch {
      toast.error('Грешка при вчитување на објави');
      return [];
    }
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
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
  }, [users, roleFilter, searchQuery]);

  if (loading) {
    return (
      <div>
        <div className="mb-6 flex flex-row gap-4 items-center">
          <div className="flex-1 h-[48px] bg-bg-light/30 rounded-lg animate-pulse" />
          <div className="w-48 h-[48px] bg-bg-light/30 rounded-lg animate-pulse" />
        </div>
        <div className="mb-4 h-5 bg-bg-light/30 rounded w-48 animate-pulse" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card p-5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1 space-y-3">
                  <div className="h-4 bg-bg-light/30 rounded w-32 animate-pulse" />
                  <div className="h-6 bg-bg-light/40 rounded w-3/4 animate-pulse" />
                  <div className="space-y-2">
                    <div className="h-4 bg-bg-light/30 rounded w-full animate-pulse" />
                    <div className="h-4 bg-bg-light/30 rounded w-5/6 animate-pulse" />
                    <div className="h-4 bg-bg-light/30 rounded w-4/6 animate-pulse" />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="h-8 bg-bg-light/30 rounded w-32 animate-pulse" />
                  <div className="h-8 bg-bg-light/30 rounded w-28 animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
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
        <>
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
                        <span className="text-primary-400">Објави:</span>{' '}
                        {user.listings?.length || 0}
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

          {loadingMore && (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <p className="mt-2 text-gray-300">Вчитување...</p>
            </div>
          )}

          {!loadingMore && (
            <>
              {meta && meta.totalPages && currentPage < meta.totalPages ? (
                <div className="text-center py-8">
                  <button
                    onClick={handleLoadMore}
                    className="btn-primary px-8 py-3 text-lg font-semibold"
                  >
                    Вчитај уште
                  </button>
                </div>
              ) : meta && meta.totalPages && currentPage >= meta.totalPages && users.length > 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-300">Нема повеќе корисници</p>
                </div>
              ) : !meta && users.length >= 20 ? (
                <div className="text-center py-8">
                  <button
                    onClick={handleLoadMore}
                    className="btn-primary px-8 py-3 text-lg font-semibold"
                  >
                    Вчитај уште
                  </button>
                </div>
              ) : null}
            </>
          )}
        </>
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
