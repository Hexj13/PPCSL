# UI Components: InfoBlock & HintTooltip

Shared UI components for displaying informational blocks and hint tooltips across the application.

## Overview

Two components provide a unified way to show contextual information:

| Component     | Purpose                                  | Trigger        | Location |
| ------------- | ---------------------------------------- | -------------- | -------- |
| `InfoBlock`   | Static informational block with icon     | Always visible | `@/ui`   |
| `HintTooltip` | "?" icon that reveals a popover on click | Click          | `@/ui`   |

---

## InfoBlock

A static block that displays helpful information with an icon (info or warning).

### Import

```tsx
import { InfoBlock } from '@/ui';
```

### Props

| Prop        | Type                  | Default  | Description                                |
| ----------- | --------------------- | -------- | ------------------------------------------ |
| `children`  | `ReactNode`           | —        | Content to display                         |
| `variant`   | `'info' \| 'warning'` | `'info'` | Icon type: info circle or warning triangle |
| `className` | `string`              | `''`     | Additional CSS classes                     |

### Usage

```tsx
<InfoBlock>
  <p>{t('listings.equipmentInfo')}</p>
</InfoBlock>

<InfoBlock variant="warning">
  <p className="font-semibold text-primary-300 text-sm mb-1">
    {t('listingDetail.vinNotProvided')}
  </p>
  <p>{t('listingDetail.vinNotProvidedDescription')}</p>
</InfoBlock>

<InfoBlock className="mb-5">
  <p>{t('listings.brandModelInfo')}</p>
</InfoBlock>
```

### Styling

- Background: `bg-primary-500/10`
- Border: `border border-primary-500/30`
- Border radius: `rounded-lg`
- Padding: `p-4`
- Icon color: `text-primary-400`
- Text: `text-sm text-text-secondary leading-relaxed`

---

## HintTooltip

A "?" icon button that reveals a popover with contextual help text when clicked.

### Import

```tsx
import { HintTooltip } from '@/ui';
```

### Props

| Prop        | Type        | Default  | Description                          |
| ----------- | ----------- | -------- | ------------------------------------ |
| `children`  | `ReactNode` | —        | Tooltip content                      |
| `ariaLabel` | `string`    | —        | Accessible label for the button      |
| `width`     | `string`    | `'w-64'` | Tailwind width class for the popover |
| `className` | `string`    | `''`     | Additional CSS classes               |

### Usage

```tsx
<div className="flex items-center gap-1.5 mb-2">
  <label className="text-sm font-semibold text-primary-500">{t('register.email')}</label>
  <HintTooltip ariaLabel={t('register.phoneHint')}>{t('register.phoneHint')}</HintTooltip>
</div>
```

### Behavior

| Feature         | Description                                                                                |
| --------------- | ------------------------------------------------------------------------------------------ |
| **Open**        | Click on the "?" icon                                                                      |
| **Close**       | Click outside, press Escape, scroll, or click the icon again                               |
| **Positioning** | Automatically opens **above** the icon if there is enough space; otherwise opens **below** |
| **Animation**   | Fade-in/fade-out with slide (150ms ease-out)                                               |
| **Arrow**       | Small triangle indicator pointing to the trigger icon                                      |
| **z-index**     | `1070` (matches `designTokens.zIndex.tooltip`)                                             |

### Styling

- Background: `bg-bg-darker`
- Border: `border-2 border-primary-500/50`
- Border radius: `rounded-lg`
- Padding: `p-3`
- Shadow: `shadow-lg`
- Text: `text-xs text-text-primary leading-relaxed`
- Icon: `text-primary-400` with `hover:text-primary-300` transition

### Accessibility

- `aria-expanded` attribute reflects open/close state
- `aria-label` for screen readers
- Keyboard support: Escape to close
- Proper focus management

### Responsive

- Works on both mobile and desktop
- Click-only trigger (no hover) for consistent mobile/desktop behavior
- Smart positioning prevents tooltip from being cut off by viewport edges

---

## Usage Locations

### InfoBlock

| Page                | File                                          | Purpose                     |
| ------------------- | --------------------------------------------- | --------------------------- |
| Create/Edit Listing | `components/ListingForm/BasicInfoSection.tsx` | Brand/model help text       |
| Create/Edit Listing | `components/ListingForm/EquipmentSection.tsx` | Equipment section help      |
| Complete Profile    | `app/complete-profile/page.tsx`               | Profile completion guidance |
| Listing Detail      | `app/listings/[id]/ListingPageClient.tsx`     | VIN not provided warning    |

### HintTooltip

| Page                | File                                          | Purpose                               |
| ------------------- | --------------------------------------------- | ------------------------------------- |
| Create/Edit Listing | `components/ListingForm/BasicInfoSection.tsx` | VIN field explanation                 |
| Complete Profile    | `app/complete-profile/page.tsx`               | Email field explanation (2 instances) |
| Listing Detail      | `app/listings/[id]/ListingPageClient.tsx`     | Vehicle history explanation           |

---

## Design Tokens

These components use the following design tokens from `ui/design-tokens.ts`:

- `zIndex.tooltip: 1070` — z-index for the HintTooltip popover

Theme colors from `theme/colors.ts`:

- `primary-400` / `primary-500` — icon and border accents
- `bg-darker` — tooltip background
- `text-primary` — tooltip text color
- `text-secondary` — info block text color

---

## Adding New Instances

When you need to show contextual help or information:

1. **Static help text** (always visible) → Use `InfoBlock`
2. **On-demand explanation** (triggered by user) → Use `HintTooltip`
3. Always provide `ariaLabel` for `HintTooltip` for accessibility
4. Use translation keys for all text content
5. Do not create custom tooltip/info implementations — use these components

---

**Last Updated:** 2026-02-11
