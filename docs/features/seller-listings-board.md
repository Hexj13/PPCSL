---
title: Seller listings board
owner: platform
tags:
  - type/guide
  - domain/listings
  - scope/core
  - status/active
---

# Feature: Seller listings board

## 1. Purpose

Add a public seller page that shows **all their active listings**, available via direct link and suitable for sharing (social, messengers, direct links).

---

## 2. Page title

**Listings from {{sellerDisplayName}}**

### `sellerDisplayName` logic:

1. Company name
2. User name
3. Phone number (always present)

---

## 3. URL and routing

### URL format

```
/board/{{nameSlug}}
```

### `nameSlug` generation logic

**Slug is always derived only from the phone number** (company name and user name are not used).

1. From the phone number take **digits only** (no spaces, parentheses, plus, etc.) → this is the slug base.
2. If there is no phone (user without phone) → use fallback `user-{{first 8 chars of userId}}`.
3. If that slug is already taken by another user → append suffix `-2`, `-3`, … until a free one is found.

Examples:

- Phone `+373 89 123 456` → `/board/37389123456`
- Collision (e.g. slug left from old data) → `/board/37389123456-2`
- No phone → `/board/user-a1b2c3d4`

**Phone number change:** when the user updates their phone in profile, `board_slug` is reset and regenerated on next access from the new number. The old board URL stops working; the new link becomes the current one.

---

## 4. Indexing and SEO

- `/board/*` pages **must NOT be indexed** by default
- Required: `meta robots: noindex, nofollow`

- Seller board URLs are included in the sitemap (`/sitemaps/sellers.xml`) only when the seller is active and has at least one Active listing; otherwise they are not in the sitemap and may use noindex. Pages are viewable by users; indexing is only for active sellers with active listings (via sitemap).

---

## 5. Page structure

The page must contain:

1. Header (standard)
2. Page title
3. Sort input (to the right of the title)
4. Seller's listing list
5. **"Load more"** button
6. Footer (standard)

---

## 6. Listings on the board

- **Only active listings** are shown
- ❌ Not shown: _Paused_, closed, archived or deleted listings

- The page visually and logically matches **"My listings"**

### Differences from "My listings":

- ❌ No management buttons on cards
- ❌ No filters
- ✅ Sorting is available

---

## 7. Sorting

- Placed **to the right of the title**
- **Same component** as in the search form
- Behavior and sort options match search

---

## 8. Loading more listings

- Same as **"My listings"** page
- **"Load more"** button: shown when there is a next page; loads data without full page reload

---

## 9. Behavior for board owner

When the **board owner** views the page, an info block (existing notification component) is shown below the title.

### Notification text:

> **This is your listings board.**
> It shows all your active listings.
> You can share this page link in messengers or social networks to show all your listings in one place.

---

## 10. Deleted or deactivated user

- If the user is deleted, deactivated, or blocked:

- Opening `/board/{{nameSlug}}`:
  - **redirects to the site homepage**
  - with no error or placeholder shown

---

## 11. Changes on "My listings" page

### New button: **"My listings board"**

- Position: **second among the buttons**
- Style: same as existing buttons
- Icon: 👁️ (eye)
- Action: navigate to `/board/{{nameSlug}}` for the current user

---

## 12. Board link from listing page

- On the listing page, in the seller contact block, a **"View all seller listings"** button is shown (if the seller has more than one active listing).
- Button action: opens the seller's board **in a new tab** (`/board/{{nameSlug}}`). For a closed listing the button is inactive (no navigation).
- No modal with seller listings — navigation to the board only.

---

## 13. Empty state

- If the seller **has no active listings** (on the board):
  - show empty state
  - same as on "My listings" page
