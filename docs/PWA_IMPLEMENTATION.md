# PWA Implementation Plan for Kupito

## What is PWA?

Progressive Web App (PWA) is a web application that uses modern web technologies to provide a native app-like experience. PWAs can be installed on users' devices (Android and iOS) directly from the browser, without going through app stores.

### Key Benefits:
- **No App Store Required**: Users can install directly from the website
- **Works Offline**: Can function with limited or no internet connection
- **Fast Loading**: Cached resources load instantly
- **Native Feel**: Looks and feels like a native mobile app
- **Automatic Updates**: Updates when users visit the site
- **Smaller Size**: Much smaller than native apps
- **Cross-Platform**: One codebase works on Android, iOS, and desktop

### Perfect for MVP:
Yes, PWA is an excellent choice for MVP because:
- No need to develop separate native apps
- No app store approval process
- Faster time to market
- Lower development and maintenance costs
- Can be upgraded to native apps later if needed

## Current Status

### ✅ Already Implemented:
- `manifest.ts` file exists with basic configuration
- PWA icons available (`pwa192.png`, `logo.png`)
- Manifest linked in `layout.tsx`
- Viewport configuration set

### ❌ Missing:
- Service Worker for offline functionality and caching
- Install prompt component
- Install button in footer
- Additional PWA icons (512x512 for Android, 180x180 for iOS)
- Offline page
- Update notification mechanism

## Implementation Plan

### Phase 1: Service Worker Setup (Priority: High)

#### 1.1 Create Service Worker
- **File**: `frontend/public/sw.js` or `frontend/public/service-worker.js`
- **Purpose**: Handle caching, offline functionality, and background updates
- **Features**:
  - Cache static assets (CSS, JS, images)
  - Cache API responses (with expiration)
  - Offline fallback page
  - Background sync for failed requests

#### 1.2 Register Service Worker
- **File**: `frontend/components/ServiceWorkerRegistration.tsx`
- **Purpose**: Register and update service worker
- **Features**:
  - Register on app load
  - Handle updates
  - Show update notification to users

### Phase 2: PWA Installation (Priority: High)

#### 2.1 Create Install Prompt Hook
- **File**: `frontend/hooks/usePWAInstall.ts`
- **Purpose**: Detect installability and handle installation
- **Features**:
  - Detect if PWA can be installed
  - Track if already installed
  - Handle installation process
  - Detect device type (iOS vs Android)

#### 2.2 Create Install Button Component
- **File**: `frontend/components/PWAInstallButton.tsx`
- **Purpose**: Button to trigger PWA installation
- **Features**:
  - Show only when installable
  - Hide when already installed
  - Different UI for iOS (instructions) vs Android (direct install)
  - Smooth animations

#### 2.3 Add Install Button to Footer
- **File**: `frontend/components/Footer.tsx`
- **Changes**: Add PWA install button
- **Location**: After cookie settings link or as a separate section

### Phase 3: Enhanced Manifest (Priority: Medium)

#### 3.1 Update Manifest
- **File**: `frontend/app/manifest.ts`
- **Improvements**:
  - Add all required icon sizes (192x192, 512x512)
  - Add iOS-specific icons (180x180)
  - Add maskable icons for Android
  - Improve descriptions
  - Add screenshots (optional)
  - Add shortcuts (optional)

#### 3.2 Generate Missing Icons
- **Action**: Create all required icon sizes from existing logo
- **Sizes needed**:
  - 192x192 (exists: `pwa192.png`)
  - 512x512 (exists: `logo.png`, verify size)
  - 180x180 for iOS (create from logo)
  - Maskable icons for Android

### Phase 4: Offline Support (Priority: Medium)

#### 4.1 Create Offline Page
- **File**: `frontend/app/offline/page.tsx`
- **Purpose**: Show when user is offline
- **Features**:
  - Friendly offline message
  - Retry button
  - Cached content preview (optional)

#### 4.2 Implement Caching Strategy
- **Strategy**: Cache-first for static assets, network-first for API calls
- **Cache expiration**: 24 hours for API responses, permanent for static assets
- **Update mechanism**: Check for updates on each visit

### Phase 5: iOS-Specific Enhancements (Priority: Low)

#### 5.1 Add iOS Meta Tags
- **File**: `frontend/app/layout.tsx`
- **Add**:
  - `apple-mobile-web-app-capable`
  - `apple-mobile-web-app-status-bar-style`
  - `apple-mobile-web-app-title`
  - Apple touch icons

#### 5.2 iOS Install Instructions
- **Component**: Show instructions modal for iOS users
- **Content**: Step-by-step guide to add to home screen

### Phase 6: Testing & Optimization (Priority: High)

#### 6.1 Testing Checklist
- [ ] Test installation on Android Chrome
- [ ] Test installation on iOS Safari
- [ ] Test offline functionality
- [ ] Test service worker updates
- [ ] Test on different screen sizes
- [ ] Test caching behavior
- [ ] Test install button visibility logic

#### 6.2 Performance Optimization
- Optimize service worker bundle size
- Implement lazy loading for service worker
- Monitor cache usage
- Optimize icon sizes

## Technical Implementation Details

### Service Worker Architecture

```typescript
// Service Worker will handle:
1. Install event: Cache static assets
2. Activate event: Clean old caches
3. Fetch event: Serve from cache or network
4. Message event: Handle updates from app
5. Sync event: Background sync for failed requests
```

### Installation Flow

```typescript
// For Android:
1. User clicks install button
2. Browser shows native install prompt
3. User confirms
4. PWA installed to home screen

// For iOS:
1. User clicks install button
2. Show instructions modal
3. User follows Safari instructions
4. PWA added to home screen
```

### Caching Strategy

- **Static Assets**: Cache-first (CSS, JS, images)
- **API Calls**: Network-first with cache fallback
- **HTML Pages**: Network-first with cache fallback
- **Cache Expiration**: 24 hours for dynamic content

## File Structure

```
frontend/
├── public/
│   ├── sw.js (or service-worker.js)
│   ├── offline.html (optional)
│   ├── icons/
│   │   ├── icon-192.png
│   │   ├── icon-512.png
│   │   ├── icon-180.png (iOS)
│   │   └── icon-maskable.png
├── components/
│   ├── ServiceWorkerRegistration.tsx
│   ├── PWAInstallButton.tsx
│   └── Footer.tsx (updated)
├── hooks/
│   └── usePWAInstall.ts
└── app/
    ├── manifest.ts (updated)
    ├── layout.tsx (updated with iOS meta tags)
    └── offline/
        └── page.tsx
```

## Dependencies

No additional npm packages required! PWA uses native browser APIs:
- Service Worker API
- Web App Manifest API
- BeforeInstallPrompt API (Android)
- Add to Home Screen (iOS)

## Translation Keys Needed

Add to `frontend/messages/mk.json`:

```json
{
  "pwa": {
    "install": "Инсталирај апликација",
    "installTitle": "Инсталирај Kupito",
    "installDescription": "Додај Kupito на твојот телефон за побрз пристап",
    "installed": "Апликацијата е инсталирана",
    "iosInstructions": "Инструкции за iOS",
    "iosStep1": "1. Кликни на копчето за споделување",
    "iosStep2": "2. Избери 'Додај на почетен екран'",
    "iosStep3": "3. Потврди со 'Додај'",
    "offline": "Нема интернет",
    "offlineMessage": "Не сте поврзани на интернет. Проверете ја вашата врска.",
    "retry": "Обиди се повторно",
    "updateAvailable": "Достапна е нова верзија",
    "updateNow": "Ажурирај сега",
    "updateLater": "Подоцна"
  }
}
```

## Implementation Order

1. **Week 1**: Service Worker + Basic Installation
   - Create service worker
   - Register service worker
   - Create install hook
   - Add install button to footer

2. **Week 2**: Enhanced Features
   - Update manifest with all icons
   - Create offline page
   - Add iOS-specific features
   - Implement update notifications

3. **Week 3**: Testing & Polish
   - Test on all platforms
   - Optimize performance
   - Add translations
   - Final adjustments

## Success Metrics

- [ ] PWA installable on Android Chrome
- [ ] PWA installable on iOS Safari
- [ ] Offline functionality works
- [ ] Service worker caches correctly
- [ ] Install button appears/disappears correctly
- [ ] No console errors
- [ ] Lighthouse PWA score > 90

## Notes

- PWA works best on HTTPS (required for production)
- Service worker requires HTTPS or localhost
- iOS has limited PWA support compared to Android
- Some features (push notifications, background sync) may have platform limitations

## Resources

- [MDN: Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Web.dev: PWA](https://web.dev/progressive-web-apps/)
- [Next.js PWA Guide](https://nextjs.org/docs/app/building-your-application/configuring/progressive-web-apps)

