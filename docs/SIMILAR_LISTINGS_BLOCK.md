# Similar Listings Block - Implementation Documentation

## Overview

The Similar Listings block is displayed at the bottom of the listing detail page, providing users with relevant alternative listings to increase engagement, favorites, and pageviews.

**Location**: Bottom of listing detail page, below all other sections.

**Design Principle**: Non-blocking, lazy-loaded feature that doesn't interfere with the main page load or image gallery performance.

## Features

### UI Components

- **Block Title**: "Слични огласи" (Similar listings)
- **Horizontal Scroll**: Touch-swipe enabled, smooth scroll behavior
- **Navigation Controls**: Left/Right arrow buttons with position counter (1/4, 2/4, 3/4, 4/4)
- **Counter Display**: Shows current position out of 4, maxing at `/4` regardless of total items
- **Cards**: Reuses `ListingCard` component - identical to homepage listings
- **Loading States**: Skeleton loaders with 200ms delay + 1s minimum display time

### Loading Strategy (4 + 4)

**Initial Load**:
- Loads **4 listings** on component mount
- Request starts after 100ms delay (non-blocking priority)
- Shows skeleton loaders while fetching

**Lazy Load**:
- Loads **4 additional listings** when user scrolls to ~80% of container width
- OR when user clicks navigation arrows near the end
- Triggered automatically by scroll event or button interaction
- Total maximum: 8 listings

### Navigation

**Desktop (non-touch devices)**:
- Left/Right arrow buttons with position counter between them
- Clicking scrolls by one card width (250px mobile, 260px desktop) + 16px gap
- Counter shows: `1/4`, `2/4`, `3/4`, `4/4`
- Buttons disable when at start/end

**Mobile (touch devices)**:
- Navigation buttons hidden
- Native touch swipe/scroll
- 16px gap between cards

### Responsive Behavior

- **Mobile**: Cards are 250px wide
- **Desktop (md+)**: Cards are 260px wide
- Container has padding that creates visual balance
- Gap between cards: 16px (Tailwind `gap-4`)

## Backend Algorithm

### Endpoint

```
GET /api/listings/:id/similar?limit=4&offset=0
GET /api/listings/:id/similar?limit=4&offset=4
```

### Ranking System

**6-Tier Bucket System** (priority 1 = most relevant):

**Important**: All buckets work only with **Active listings**. The `status = Active` filter is applied globally at the SQL query level before bucket assignment, ensuring that all 6 buckets process only active listings.

1. **Same brand + model, year ±5**
   - `brand_id` matches
   - `model_id` matches
   - `year` within ±5 years
   - ✅ Only Active listings

2. **Same brand + body type, year ±5, price ±50%**
   - `brand_id` matches
   - `body_type` matches
   - `year` within ±5 years
   - `price` within 50-150% range
   - ✅ Only Active listings

3. **Same body type, year ±5, price ±50%**
   - `body_type` matches
   - `year` within ±5 years
   - `price` within 50-150% range
   - ✅ Only Active listings

4. **Same body type, price ±50%**
   - `body_type` matches
   - `price` within 50-150% range
   - ✅ Only Active listings

5. **Year ±5, price ±50%**
   - `year` within ±5 years
   - `price` within 50-150% range
   - ✅ Only Active listings

6. **Fallback: all other active listings**
   - All remaining Active listings that don't match buckets 1-5
   - ✅ Only Active listings (filter applied globally)

### Sorting Within Buckets

For listings in the same bucket, secondary sorting:

1. **Promoted status** (`is_promoted DESC`) - promoted listings first
2. **Same city** (`same_city DESC`) - listings from same city first
3. **Freshness** (`last_updated_at DESC`) - newer listings first

This means:
- ✅ Promoted listings always rank higher within their relevance tier
- ✅ Listings from the same city get a boost
- ✅ Newer listings break ties between otherwise equal results

### Seller Diversification

- **Rule**: Maximum 2 listings per seller in final results
- Applied globally across all 8 results
- If more than 2 from same seller, extras are skipped
- System continues fetching from next buckets until 8 results or exhausted

### Data Filters

**Global SQL Query Filters** (applied before bucket assignment):
- ✅ **Only Active listings** (`status = Active`) - applied globally for all buckets
- ✅ Must have `vehicle.year` and `vehicle.body_type`
- ✅ Valid promoted listings (not expired: `is_promoted = false OR (is_promoted = true AND promoted_until > NOW())`)
- ✅ Excludes current listing (`listing.id != :currentId`)

**Included**:
- Only Active listings (filtered at SQL level)
- Must have `vehicle.year` and `vehicle.body_type`
- Valid promoted listings (not expired)

**Excluded**:
- Current listing (the one being viewed)
- Paused/Closed listings (filtered out by `status = Active`)
- Listings missing required vehicle data

### Caching

- **TTL**: 2 minutes (120 seconds)
- **Key**: `similar:${listingId}`
- **Strategy**: Cache full 8 results, slice for limit/offset
- **Storage**: Redis

## Frontend Implementation

### Component Structure

```
SimilarListings
├── Title + Navigation Controls (desktop only)
├── Scrollable Container
│   ├── First Batch (4 cards or skeletons)
│   └── Second Batch (4 cards or skeletons, lazy-loaded)
└── Analytics Tracking
```

### State Management

```typescript
- firstBatch: Listing[]        // Initial 4 listings
- secondBatch: Listing[]       // Lazy-loaded 4 listings
- isLoadingFirst: boolean      // Loading state for first batch
- isLoadingSecond: boolean     // Loading state for second batch
- hasLoadedSecond: boolean     // Whether second batch was loaded
- currentPosition: number      // Current scroll position (1-4)
- canScrollLeft: boolean       // Whether left button is enabled
- canScrollRight: boolean      // Whether right button is enabled
```

### Scroll Behavior

**Button Click Navigation**:
- Calculates card width from DOM: `cards[0].offsetWidth`
- Scrolls by: `cardWidth + 16px` (gap)
- Uses `scrollBy({ left: ±distance, behavior: 'smooth' })`
- Updates position counter: increment/decrement by 1
- Position counter maxes at 4

**Touch/Manual Scroll**:
- Natural browser scrolling with 16px gap
- When 80% scrolled: triggers second batch load
- No forced snap points (removed for smoother UX)

### Loading States

**Initial Load**:
- Shows 4 `ListingCardSkeleton` components
- Request delayed by 100ms (non-blocking)
- Skeletons follow 200ms + 1s pattern via `SkeletonContainer`

**Second Batch Load**:
- Triggers at 80% scroll or near-end button click
- Shows 4 additional skeletons
- Fetches `offset=4, limit=4`
- Replaces skeletons with cards when loaded

### Error Handling

- **API Error**: Block doesn't render (graceful degradation)
- **No Results**: Block doesn't render
- **Partial Results**: Shows whatever is available (1-7 listings)
- **Network Errors**: Silent failure, no user-facing errors

## Analytics

### Tracked Events

1. **`similar_block_impression`**
   - Fires when block enters viewport
   - Uses IntersectionObserver with 10% threshold
   - Params: `listingId`, `totalCount`
   - Fires once per page load

2. **`similar_card_click`**
   - Fires when user clicks a card
   - Params: `listingId`, `clickedListingId`, `position` (1-8)
   - Tracks which similar listing was clicked

3. **`similar_scroll`**
   - Fires when second batch is loaded
   - Params: `listingId`
   - Indicates user engagement with scrolling

4. **`similar_favorite_toggle`**
   - Fires when user toggles favorite on a card
   - Params: `listingId`, `targetListingId`, `action` (add/remove)
   - Tracks favorite interactions within block

## Accessibility

- **Semantic HTML**: `<section role="region">` with `aria-label`
- **List Structure**: `role="list"` on container, `role="listitem"` on cards
- **Keyboard Navigation**: Arrow buttons are keyboard accessible
- **Focus Management**: Tab navigation through cards
- **Screen Reader**: Announces block title and navigation controls

## Performance

### Optimization Strategies

1. **Non-blocking Load**: 100ms delay prevents blocking main page
2. **Lazy Second Batch**: Only loads when user shows interest
3. **Efficient Query**: Single query with CASE expressions for bucket priority
4. **Caching**: 2-minute cache reduces database load
5. **Limit to 50 candidates**: Prevents large result sets

### Performance Targets

- **API Response**: < 100ms (p95) with cache, < 300ms without
- **Cache Hit Rate**: > 80%
- **Database Indexes**: Optimized for bucket queries

## Configuration

### Constants

```typescript
FIRST_BATCH_SIZE = 4
SECOND_BATCH_SIZE = 4
TOTAL_MAX_RESULTS = 8
SCROLL_TRIGGER_THRESHOLD = 0.8  // 80%
LOAD_DELAY = 100  // ms
CARD_GAP = 16  // px
```

### Feature Detection

- Touch device detection for hiding navigation buttons
- Uses: `'ontouchstart' in window || navigator.maxTouchPoints > 0`

## Translation Keys

```json
{
  "similarListings": {
    "title": "Слични огласи",
    "scrollLeft": "Scroll left",
    "scrollRight": "Scroll right"
  }
}
```

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Current listing not found | Returns empty array, block doesn't render |
| Current listing inactive | Returns empty array, block doesn't render |
| Less than 4 results | Shows available count, no second batch |
| Price is null/0 | Skips price-dependent buckets (2, 3, 4, 5) |
| All from same seller | Diversification limits to 2, rest filled from next buckets |
| Rapid scrolling | Single request, no duplicates |
| API error | Block doesn't render, no error shown to user |

## Browser Compatibility

- **Scroll Behavior**: `scroll-smooth` with fallback
- **Intersection Observer**: Native support in modern browsers
- **CSS Gap**: Flexbox gap support (modern browsers)
- **Touch Events**: Works on all touch devices

## Files

### Frontend
- `core/frontend/components/SimilarListings.tsx` - Main component
- `core/frontend/app/listings/[id]/ListingPageClient.tsx` - Integration
- `core/frontend/lib/api.ts` - API client (`getSimilar` method)
- `core/frontend/lib/analytics.ts` - Analytics events

### Backend
- `core/backend/src/listings/listings.controller.ts` - Endpoint
- `core/backend/src/listings/listings.service.ts` - Business logic (`findSimilar`, `fetchSimilarCandidates`, `applySellerDiversification`)
- `core/backend/src/listings/dto/similar-listings.dto.ts` - DTO validation

### Documentation
- `core/docs/SIMILAR_LISTINGS_BLOCK.md` - This file

## Future Enhancements (Not Implemented)

- Personalization based on user history
- ML-based relevance ranking
- Infinite scroll beyond 8 items
- Filters/sorting within the block
- A/B testing different algorithms
- SSR support
- "View all similar" button
