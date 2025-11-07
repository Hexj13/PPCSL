# SEO Optimization Documentation

This document describes the SEO optimizations implemented for the Kupito platform.

## Overview

The site has been optimized for Google Search Engine Optimization with comprehensive meta tags, structured data, sitemap, and robots.txt configuration.

## Implemented Features

### 1. Meta Tags Configuration

#### Root Layout (`app/layout.tsx`)
- **Comprehensive metadata**: Title, description, keywords
- **Open Graph tags**: For social media sharing (Facebook, LinkedIn, etc.)
- **Twitter Cards**: Optimized for Twitter sharing
- **Canonical URLs**: Prevents duplicate content issues
- **Robots directives**: Proper indexing instructions for search engines
- **Google verification**: Support for Google Search Console verification

#### Dynamic Meta Tags for Listings (`app/listings/[id]/layout.tsx`)
- Dynamic title generation based on vehicle information
- Dynamic description from listing content
- Dynamic Open Graph images
- Keywords based on listing data (brand, model, city, etc.)

#### Home Page (`app/page.tsx`)
- Optimized title and description for the main page
- Relevant keywords for the marketplace

### 2. Robots.txt (`app/robots.ts`)

- Allows all search engines to crawl public pages
- Blocks access to API routes, admin, and authentication pages
- Points to sitemap location
- Optimized for both general crawlers and Googlebot

### 3. Sitemap (`app/sitemap.ts`)

- Dynamic sitemap generation
- Includes all active listings
- Updates automatically (revalidated every hour)
- Proper priority and change frequency settings
- Includes base pages (home, listings index, my-listings)

### 4. Structured Data (Schema.org)

#### Organization Schema (`components/OrganizationSchema.tsx`)
- Organization information for the platform
- Helps Google understand the business entity
- Added to root layout
- **Enhanced**: Added SearchAction for site search functionality
- **Enhanced**: Improved description and language settings

#### WebSite Schema (`components/OrganizationSchema.tsx`)
- **NEW**: WebSite schema added for better site understanding
- Includes SearchAction for Google search box integration
- Helps Google understand site structure and search functionality

#### Vehicle Schema (`components/StructuredData.tsx`)
- **ENHANCED**: Changed from Product to Vehicle schema for more accurate vehicle markup
- Vehicle-specific information for each listing
- Includes:
  - Vehicle details (brand, model, year)
  - VIN numbers (when available)
  - Mileage and engine specifications
  - Fuel type, transmission, body type, color
  - Production date
- More accurate than generic Product schema for automotive listings

#### Product Schema (`components/StructuredData.tsx`)
- **ENHANCED**: Still included alongside Vehicle schema for compatibility
- Product information for each listing
- Includes:
  - Pricing information
  - Availability status
  - Images
  - Seller information
  - Location data

#### BreadcrumbList Schema
- Navigation structure for listings
- Helps Google understand site hierarchy
- Improves search result display with breadcrumbs

### 5. Next.js Configuration (`next.config.js`)

- **Compression**: Enabled for better performance
- **Security headers**: X-Frame-Options, X-Content-Type-Options, etc.
- **Image optimization**: AVIF and WebP format support
- **Optimized image sizes**: Device-specific image sizes
- **DNS prefetch**: Enabled for faster resource loading

### 6. PWA Manifest (`app/manifest.ts`)

- Progressive Web App support
- App icons configuration
- Theme colors and display settings
- Improves mobile experience and SEO

### 7. Dynamic Open Graph Images (`app/opengraph-image.tsx`)

- Automatically generated OG images for social sharing
- Branded with site logo and tagline
- Optimized 1200x630px format

### 8. Image Alt Text Optimization

- All images have descriptive alt text
- Alt text includes listing titles and context
- **Status**: Basic alt text implemented
- **TODO**: Consider adding vehicle details (brand, model, year) to alt text for better SEO

### 9. Site Tagline

- Consistent tagline "Купете или продадете авто на Kupito!" across all pages
- Used in meta descriptions, Footer, and main page
- Helps with brand recognition and SEO

### 6. Performance Optimizations

- Image optimization with Next.js Image component
- Lazy loading for images
- Proper caching strategies (revalidation)
- Compression enabled

## Environment Variables

Add these to your `.env.local` file:

```env
NEXT_PUBLIC_SITE_URL=https://kupito.mk
NEXT_PUBLIC_GOOGLE_VERIFICATION=your-verification-code
```

## SEO Checklist

- [x] Meta tags (title, description, keywords)
- [x] Open Graph tags
- [x] Twitter Cards
- [x] Canonical URLs
- [x] Robots.txt
- [x] Sitemap.xml
- [x] Structured data (Schema.org)
- [x] Dynamic meta tags for listings
- [x] Breadcrumb navigation (structured data)
- [x] Image optimization
- [x] Security headers
- [x] Language attributes (lang="mk")
- [x] Mobile-friendly viewport
- [x] PWA Manifest
- [x] Dynamic OG images
- [x] Alt text for all images
- [x] Consistent site tagline
- [x] Icon configuration

## TODO: Remaining SEO Tasks

### High Priority

1. **Google Search Console Setup** ⚠️ **NOT DONE**
   - [ ] Create account at https://search.google.com/search-console
   - [ ] Add property (URL: https://kupito.mk)
   - [ ] Verify site using HTML meta tag method
   - [ ] Add verification code to `NEXT_PUBLIC_GOOGLE_VERIFICATION` in `.env.local`
   - [ ] Submit sitemap: `https://kupito.mk/sitemap.xml`
   - [ ] Monitor indexing status and search performance
   - **Instructions**: See section below

2. **Google Analytics Setup** ⚠️ **NOT DONE**
   - [ ] Create account at https://analytics.google.com/
   - [ ] Create property for kupito.mk
   - [ ] Get Measurement ID (format: G-XXXXXXXXXX)
   - [ ] Add Measurement ID to `NEXT_PUBLIC_GA_ID` in `.env.local`
   - [ ] Create `components/GoogleAnalytics.tsx` component
   - [ ] Add component to `app/layout.tsx`
   - [ ] Verify tracking in Google Analytics Real-Time reports
   - **Instructions**: See section below

3. **Favicon and Icons** ⚠️ **NOT DONE**
   - [ ] Create favicon.ico (16x16, 32x32, 48x48)
   - [ ] Add to `/public/favicon.ico`
   - [ ] Create app icons for PWA (various sizes)
   - [ ] Update `app/manifest.ts` with icon paths

4. **Open Graph Image** ⚠️ **NOT DONE**
   - [ ] Create default OG image: `/public/og-image.jpg` (1200x630px)
   - [ ] Should include site logo and tagline
   - [ ] Currently using dynamic generation, but static fallback needed

5. **Organization Logo** ⚠️ **NOT DONE**
   - [ ] Create logo: `/public/logo.png`
   - [ ] Used in Organization schema
   - [ ] Should be high quality, transparent background recommended

### Medium Priority

6. **Internal Linking Improvements** ⚠️ **NOT DONE**
   - [ ] Add "Similar Listings" component on listing pages
   - [ ] Make brand/model/city clickable links in listing characteristics
   - [ ] Improve footer with more internal links
   - [ ] Add related categories/popular searches on homepage
   - **Note**: Code structure ready, needs implementation

7. **Enhanced Alt Text** ⚠️ **PARTIALLY DONE**
   - [ ] Add vehicle details (brand, model, year) to image alt text
   - [ ] Make alt text more descriptive and keyword-rich
   - [ ] Currently basic alt text is implemented

8. **Performance Monitoring** ⚠️ **NOT DONE**
   - [ ] Set up Core Web Vitals monitoring
   - [ ] Integrate with Google Search Console
   - [ ] Monitor page speed metrics
   - [ ] Optimize based on Core Web Vitals data

### Low Priority (Long-term)

9. **Content Strategy**
   - [ ] Consider adding blog section
   - [ ] Regular articles about cars, buying tips, etc.
   - [ ] Helps with SEO and user engagement

10. **Backlinks**
    - [ ] Build quality backlinks from relevant sites
    - [ ] Partner with automotive websites
    - [ ] Local business directories

11. **Local SEO** (if applicable)
    - [ ] Google Business Profile
    - [ ] Local citations
    - [ ] Location-specific content

## Testing

### Validate Structured Data
- Use [Google Rich Results Test](https://search.google.com/test/rich-results)
- Use [Schema.org Validator](https://validator.schema.org/)

### Check Meta Tags
- Use [Meta Tags Checker](https://metatags.io/)
- View page source and check `<head>` section

### Test Sitemap
- Visit `/sitemap.xml` to verify it's generating correctly
- Submit to Google Search Console

### Test Robots.txt
- Visit `/robots.txt` to verify it's generating correctly
- Test with [Google Robots.txt Tester](https://www.google.com/webmasters/tools/robots-testing-tool)

## Setup Instructions

### Google Search Console Setup

1. Go to https://search.google.com/search-console
2. Sign in with your Google account
3. Click "Add Property" → Select "URL prefix"
4. Enter: `https://kupito.mk`
5. Choose verification method: **HTML tag**
6. Copy the `content` value from the meta tag (e.g., `abc123xyz...`)
7. Add to `frontend/.env.local`:
   ```env
   NEXT_PUBLIC_GOOGLE_VERIFICATION=abc123xyz...
   ```
8. Restart your development server
9. Go back to Search Console and click "Verify"
10. After verification, go to "Sitemaps" and submit: `sitemap.xml`

### Google Analytics Setup

1. Go to https://analytics.google.com/
2. Sign in and click "Start measuring"
3. Create account: "Kupito"
4. Create property: "Kupito Website"
5. Set timezone: (GMT+01:00) Skopje
6. Create data stream: Web → `https://kupito.mk`
7. Copy Measurement ID (format: `G-XXXXXXXXXX`)
8. Add to `frontend/.env.local`:
   ```env
   NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
   ```
9. Create component `frontend/components/GoogleAnalytics.tsx`:
   ```tsx
   'use client';
   import Script from 'next/script';
   import { usePathname } from 'next/navigation';
   import { useEffect } from 'react';

   export function GoogleAnalytics() {
     const gaId = process.env.NEXT_PUBLIC_GA_ID;
     const pathname = usePathname();

     useEffect(() => {
       if (!gaId || typeof window === 'undefined' || !window.gtag) return;
       window.gtag('config', gaId, { page_path: pathname });
     }, [pathname, gaId]);

     if (!gaId) return null;

     return (
       <>
         <Script
           strategy="afterInteractive"
           src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
         />
         <Script
           id="google-analytics"
           strategy="afterInteractive"
           dangerouslySetInnerHTML={{
             __html: `
               window.dataLayer = window.dataLayer || [];
               function gtag(){dataLayer.push(arguments);}
               gtag('js', new Date());
               gtag('config', '${gaId}', {
                 page_path: window.location.pathname,
               });
             `,
           }}
         />
       </>
     );
   }

   declare global {
     interface Window {
       gtag: (command: 'config' | 'event' | 'js' | 'set', targetId: string | Date, config?: Record<string, unknown>) => void;
       dataLayer: unknown[];
     }
   }
   ```
10. Add to `frontend/app/layout.tsx`:
   ```tsx
   import { GoogleAnalytics } from '@/components/GoogleAnalytics';
   
   // In RootLayout component, add:
   <GoogleAnalytics />
   ```
11. Restart server and verify in Analytics → Real-Time reports

### Internal Linking Implementation

To improve internal linking, consider:

1. **Similar Listings Component**:
   - Create `components/SimilarListings.tsx`
   - Fetch listings by brand/model/city
   - Display on listing pages
   - Add link to filtered search results

2. **Clickable Characteristics**:
   - Make brand/model/city clickable in listing page
   - Link to filtered search: `/listings?brand_id=...`
   - Improves navigation and SEO

3. **Enhanced Footer**:
   - Add more internal links
   - Categories, popular searches
   - Site structure navigation

## Monitoring

1. **Google Search Console**: Monitor indexing status, search performance (⚠️ Setup required)
2. **Google Analytics**: Track organic traffic, user behavior (⚠️ Setup required)
3. **Core Web Vitals**: Monitor page speed and user experience metrics
4. **Rankings**: Track keyword rankings (optional, use tools like Ahrefs, SEMrush)

## Notes

- All user-facing text is in Macedonian language as per project requirements
- The site is optimized for Macedonian market (Macedonia)
- Language attribute is set to "mk" (Macedonian)
- Structured data uses appropriate locale (mk_MK)

