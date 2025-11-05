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

#### Product Schema (`components/StructuredData.tsx`)
- Product information for each listing
- Includes:
  - Vehicle details (brand, model, year)
  - Pricing information
  - Availability status
  - Images
  - Seller information
  - Location data
  - VIN numbers (when available)
  - Mileage and engine specifications

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
- Improves accessibility and SEO

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

## Next Steps (Optional Enhancements)

1. **Google Search Console**: Set up and verify the site
2. **Google Analytics**: Add tracking code
3. **Favicon**: Add favicon and app icons
4. **OG Image**: Create a default Open Graph image (`/public/og-image.jpg`)
5. **Logo**: Add organization logo (`/public/logo.png`)
6. **Performance Monitoring**: Set up Core Web Vitals monitoring
7. **Backlinks**: Build quality backlinks
8. **Content Strategy**: Regular blog posts or articles about cars
9. **Internal Linking**: Improve internal linking structure
10. **Alt Text**: Ensure all images have descriptive alt text

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

## Monitoring

1. **Google Search Console**: Monitor indexing status, search performance
2. **Google Analytics**: Track organic traffic, user behavior
3. **Core Web Vitals**: Monitor page speed and user experience metrics
4. **Rankings**: Track keyword rankings (optional, use tools like Ahrefs, SEMrush)

## Notes

- All user-facing text is in Macedonian language as per project requirements
- The site is optimized for Macedonian market (Macedonia)
- Language attribute is set to "mk" (Macedonian)
- Structured data uses appropriate locale (mk_MK)

