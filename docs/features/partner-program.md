---
title: Partner program
owner: platform
tags:
  - type/feature
  - scope/frontend
  - scope/backend
  - status/active
---

# Partner program

Platform partners are regular users with additional partner fields on the user record:

- `isPlatformPartner`
- `freePromotionBalance`
- `partnerListingProgress`

The feature is implemented without a separate role. Admins manage the partner flag and free-promotion balance from the admin users tab.

## Backend contract

- `GET /api/auth/me` returns partner fields on the user profile.
- `PATCH /api/admin/users/:id/profile` updates profile fields (email, individual names, or company fields) for a user; admin-only.
- `PATCH /api/admin/users/:id/partner-settings` updates partner status and free-promotion balance.
- `GET /api/listings/promotion-access` returns both legacy promotion access flags and partner state:
  - `isPartner`
  - `freePromotionBalance`
  - `partnerListingProgress`
  - `listingsUntilNextFreePromotion`
- `PATCH /api/listings/:id/promote` accepts optional `source`:
  - `default`
  - `partner_balance`

## Reward flow

- Every 20 new listings created by a partner add 1 free promotion.
- The reward is counted only for new listings created after release.
- Listing create responses may include `partnerReward` when a new reward was granted so the frontend can show an additional toast without an extra request.

## Promotion history

Promotion history keeps `promotion_source`:

- `duration`
- `partner_balance`
- `admin_unlimited`

This is used by the user and admin promotion history views to distinguish standard, partner-balance, and admin-unlimited promotions.

## Frontend behavior

- Admin users tab shows partner status directly on the card and exposes an edit modal.
- Profile page includes a dedicated partnership section with status, balance, and next-reward counter.
- My Listings and the listing detail page reuse the existing promotion modal and add partner unlimited promotion from balance.
- Listing cards and listing detail show a `Platform partner` badge when the seller is a partner.
- Footer partners are configured in platform `config/site.ts` and rendered from root assets.
