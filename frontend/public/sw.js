const CACHE_NAME = 'kupito-v3';
const STATIC_CACHE_NAME = 'kupito-static-v3';
const DATA_CACHE_NAME = 'kupito-data-v3';
const CACHE_EXPIRY = 60 * 60 * 1000;
const MAX_CACHE_SIZE = 2 * 1024 * 1024;

const STATIC_ASSETS = ['/offline'];

const installHandler = async () => {
  const staticCache = await caches.open(STATIC_CACHE_NAME);
  const results = await Promise.allSettled(
    STATIC_ASSETS.map((url) => 
      staticCache.add(url).catch((error) => {
        console.warn(`Failed to cache ${url}:`, error.message || error);
        return null;
      })
    )
  );
  
  const failed = results.filter((r) => r.status === 'rejected' || (r.status === 'fulfilled' && r.value === null));
  if (failed.length > 0) {
    console.warn(`Failed to cache ${failed.length} out of ${STATIC_ASSETS.length} static assets`);
  }
};

const activateHandler = async () => {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames
      .filter((name) => name !== CACHE_NAME && name !== STATIC_CACHE_NAME && name !== DATA_CACHE_NAME)
      .map((name) => caches.delete(name))
  );
  
  const dataCache = await caches.open(DATA_CACHE_NAME);
  const cachedRequests = await dataCache.keys();
  const now = Date.now();
  
  for (const request of cachedRequests) {
    const cachedResponse = await dataCache.match(request);
    if (cachedResponse) {
      const cacheTime = cachedResponse.headers.get('sw-cache-time');
      if (cacheTime) {
        const age = now - parseInt(cacheTime, 10);
        if (age > CACHE_EXPIRY) {
          await dataCache.delete(request);
        }
      }
    }
  }
};

const isStaticAsset = (url) => {
  return (
    url.endsWith('.js') ||
    url.endsWith('.css') ||
    url.endsWith('.png') ||
    url.endsWith('.jpg') ||
    url.endsWith('.jpeg') ||
    url.endsWith('.svg') ||
    url.endsWith('.ico') ||
    url.endsWith('.woff') ||
    url.endsWith('.woff2') ||
    url.endsWith('.ttf')
  );
};

const isListingPage = (url) => {
  return url.pathname.startsWith('/listings/') && url.pathname !== '/listings' && !url.pathname.includes('/new');
};

const isSmallApiEndpoint = (url) => {
  const pathname = url.pathname;
  return (
    pathname === '/api/brands' ||
    pathname === '/api/cities' ||
    pathname.startsWith('/api/brands/') && pathname.endsWith('/models')
  );
};

const SMALL_API_CACHE_TTL = 60 * 60 * 1000;

const getResponseSize = async (response) => {
  const clone = response.clone();
  const blob = await clone.blob();
  return blob.size;
};

const shouldCache = async (response) => {
  if (!response || !response.ok) return false;
  try {
    const size = await getResponseSize(response);
    return size <= MAX_CACHE_SIZE;
  } catch {
    return false;
  }
};

const getSameOriginUrl = (url) => {
  try {
    const parsed = new URL(url, location.origin);
    return parsed.origin === location.origin ? parsed.href : null;
  } catch {
    return null;
  }
};

const fetchHandler = async (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.origin !== location.origin) {
    return fetch(request);
  }

  if (isSmallApiEndpoint(url)) {
    const apiCache = await caches.open(DATA_CACHE_NAME);
    const cached = await apiCache.match(request);
    
    if (cached) {
      const cacheTime = cached.headers.get('sw-cache-time');
      if (cacheTime) {
        const age = Date.now() - parseInt(cacheTime, 10);
        if (age < SMALL_API_CACHE_TTL) {
          try {
            const networkResponse = await fetch(request);
            if (networkResponse.ok) {
              const canCache = await shouldCache(networkResponse);
              if (canCache) {
                const responseClone = networkResponse.clone();
                const headers = new Headers(responseClone.headers);
                headers.set('sw-cache-time', Date.now().toString());
                const cachedResponse = new Response(responseClone.body, {
                  status: responseClone.status,
                  statusText: responseClone.statusText,
                  headers: headers,
                });
                await apiCache.put(request, cachedResponse).catch((error) => {
                  console.warn(`Failed to cache API response ${request.url}:`, error);
                });
              }
              return networkResponse;
            }
          } catch {
            return cached;
          }
        }
      }
      return cached;
    }
    
    try {
      const response = await fetch(request);
      if (response.ok) {
        const canCache = await shouldCache(response);
        if (canCache) {
          const responseClone = response.clone();
          const headers = new Headers(responseClone.headers);
          headers.set('sw-cache-time', Date.now().toString());
          const cachedResponse = new Response(responseClone.body, {
            status: responseClone.status,
            statusText: responseClone.statusText,
            headers: headers,
          });
          await apiCache.put(request, cachedResponse).catch((error) => {
            console.warn(`Failed to cache API response ${request.url}:`, error);
          });
        }
      }
      return response;
    } catch (error) {
      const fallbackCached = await apiCache.match(request);
      if (fallbackCached) {
        return fallbackCached;
      }
      throw error;
    }
  }

  if (isStaticAsset(request.url)) {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    try {
      const response = await fetch(request);
      if (response.ok) {
        const canCache = await shouldCache(response);
        if (canCache) {
          const cache = await caches.open(STATIC_CACHE_NAME);
          cache.put(request, response.clone()).catch((error) => {
            console.warn(`Failed to cache ${request.url}:`, error);
          });
        }
      }
      return response;
    } catch (error) {
      const cached = await caches.match(request);
      if (cached) {
        return cached;
      }
      throw error;
    }
  }

  if (request.mode === 'navigate') {
    const isFavoritesPage = url.pathname === '/favorites';
    const isProfilePage = url.pathname === '/profile';
    const isMyListingsPage = url.pathname === '/my-listings';
    const isListingDetailPage = isListingPage(url);
    
    if (isFavoritesPage || isProfilePage || isMyListingsPage || isListingDetailPage) {
      const dataCache = await caches.open(DATA_CACHE_NAME);
      const cached = await dataCache.match(request);
      
      if (cached) {
        const cacheTime = cached.headers.get('sw-cache-time');
        if (cacheTime) {
          const age = Date.now() - parseInt(cacheTime, 10);
          if (age < CACHE_EXPIRY) {
            try {
              const networkResponse = await fetch(request);
              if (networkResponse.ok) {
                const canCache = await shouldCache(networkResponse);
                if (canCache) {
                  const responseClone = networkResponse.clone();
                  const headers = new Headers(responseClone.headers);
                  headers.set('sw-cache-time', Date.now().toString());
                  const cachedResponse = new Response(responseClone.body, {
                    status: responseClone.status,
                    statusText: responseClone.statusText,
                    headers: headers,
                  });
                  await dataCache.put(request, cachedResponse).catch((error) => {
                    console.warn(`Failed to cache ${request.url}:`, error);
                  });
                }
                return networkResponse;
              }
            } catch {
              return cached;
            }
          }
        }
        return cached;
      }
      
      try {
        const response = await fetch(request);
        if (response.ok) {
          const canCache = await shouldCache(response);
          if (canCache) {
            const responseClone = response.clone();
            const headers = new Headers(responseClone.headers);
            headers.set('sw-cache-time', Date.now().toString());
            const cachedResponse = new Response(responseClone.body, {
              status: responseClone.status,
              statusText: responseClone.statusText,
              headers: headers,
            });
            await dataCache.put(request, cachedResponse).catch((error) => {
              console.warn(`Failed to cache ${request.url}:`, error);
            });
          }
        }
        return response;
      } catch (error) {
        const fallbackCached = await dataCache.match(request);
        if (fallbackCached) {
          return fallbackCached;
        }
        if (isFavoritesPage || isProfilePage || isMyListingsPage || isListingDetailPage) {
          const offlinePage = await caches.match('/offline');
          if (offlinePage) {
            return offlinePage;
          }
        }
        throw error;
      }
    }
  }

  try {
    const response = await fetch(request);
    if (response.ok && request.mode !== 'navigate') {
      const canCache = await shouldCache(response);
      if (canCache) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone()).catch((error) => {
          console.warn(`Failed to cache ${request.url}:`, error);
        });
      }
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    if (request.mode === 'navigate') {
      const offlinePage = await caches.match('/offline');
      if (offlinePage) {
        return offlinePage;
      }
    }
    throw error;
  }
};

self.addEventListener('install', (event) => {
  event.waitUntil(installHandler());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const claimPromise = self.clients.claim();
      try {
        await activateHandler();
      } catch (error) {
        console.warn('Service worker activation cleanup failed:', error);
      }
      await claimPromise;
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  try {
    const url = new URL(request.url);
    if (url.origin !== location.origin) {
      return;
    }
  } catch {
    return;
  }
  event.respondWith(fetchHandler(event));
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'CACHE_URLS') {
    const urls = Array.isArray(event.data.urls) ? event.data.urls : [];
    event.waitUntil(
      caches.open(CACHE_NAME).then(async (cache) => {
        const results = await Promise.allSettled(
          urls.map(async (url) => {
            try {
              const cacheUrl = getSameOriginUrl(url);
              if (!cacheUrl) {
                return;
              }
              const response = await fetch(cacheUrl);
              if (response.ok) {
                const canCache = await shouldCache(response);
                if (canCache) {
                  await cache.put(cacheUrl, response);
                }
              }
            } catch (error) {
              console.warn(`Failed to cache ${url}:`, error);
            }
          })
        );
        return results;
      })
    );
  }
});

