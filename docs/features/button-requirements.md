---
title: Button requirements
owner: platform
tags:
  - type/guide
  - domain/engineering
  - scope/core
  - status/active
---

# Button visual requirements

This document describes visual requirements and standards for all buttons in the PPCSL project.

## General principles

- All buttons must be accessible and meet WCAG 2.1 AA
- Visual hierarchy must clearly reflect action importance
- Button states must be visually distinct
- Animations and transitions must be smooth and non-distracting
- Buttons must be consistent across the application

## Button variants

### Primary

**Purpose:** Main action on the page or section.

**Visual specs:**

- **Background:** `#40916B` (primary-500)
- **Text:** White (`text-white`)
- **Height (md/lg):** `52px` (fixed)
- **Shadow (md/lg):**
  - Default: `0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)`
  - On hover: `0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)`
- **Shadow (xs/sm):** None
- **Hover:**
  - Text: `primary-100` (light green)
  - Shadow increases (md/lg only)
- **Active:** Slight background darkening
- **Border:** None
- **Radius:** `rounded-lg` (8px)

**Use for:** Form submit, important confirmations, primary CTA, navigation to key sections.

### Secondary

**Purpose:** Secondary actions, alternatives.

**Visual specs:**

- **Background:** `bg-bg-secondary` (`#F4F4F4`)
- **Border:** `2px solid` with `primary-500/30` opacity
- **Text:** White (`text-white`)
- **Hover:**
  - Border: `primary-500` (full opacity)
  - Text: `primary-100`
- **Radius:** `rounded-lg` (8px)
- **Shadow:** None

**Use for:** Alternative actions, extra options, secondary CTA.

### Outline

**Purpose:** Tertiary actions, cancel, neutral actions.

**Visual specs:**

- **Background:** Transparent (`bg-transparent`)
- **Border:** `2px solid primary-500`
- **Text:** `primary-500`
- **Hover:** Border and text `primary-400`
- **Radius:** `rounded-lg` (8px)
- **Shadow:** None

**Use for:** Cancel, neutral actions, extra options without emphasis.

### Yellow

**Purpose:** Accent actions, draw attention.

**Visual specs:**

- **Background:** Gradient `from-accent to-accent` (`#ec9e1c`)
- **Text:** White (`text-white`)
- **Shadow:** Default `shadow-lg`, hover `shadow-xl`
- **Hover:** Text `accent/90`, shadow increases
- **Radius:** `rounded-lg` (8px)
- **Border:** None

**Use for:** Special offers, promos, important notices.

### Green Dark

**Purpose:** Premium actions, important confirmations.

**Visual specs:**

- **Background:** Gradient `from-primary-700 to-primary-800` (`#2E6F51` → `#245a45`)
- **Text:** White (`text-white`)
- **Shadow:** Default `shadow-lg`, hover `shadow-xl`
- **Hover:** Text `primary-200`, shadow increases
- **Radius:** `rounded-lg` (8px)
- **Border:** None

**Use for:** Premium features, important confirmations, high-priority actions.

## Sizes

### Extra Small (xs)

**Specs:**

- **Padding:** `px-3 py-1.5` (12px horizontal, 6px vertical)
- **Text size:** `text-sm` (14px)
- **Height:** Auto
- **Shadow:** None

**Use for:** Compact UIs, inside cards, secondary actions in tight space.

### Small (sm)

**Specs:**

- **Padding:** `px-3 py-1.5` (12px horizontal, 6px vertical)
- **Text size:** `text-sm` (14px)
- **Height:** Auto
- **Shadow:** None

**Use for:** Compact forms, secondary actions, mobile UIs.

### Medium (md) — default

**Specs:**

- **Padding:**
  - Mobile: `px-4 py-2.5` (16px × 10px)
  - Desktop: `px-6 py-3` (24px × 12px)
- **Text size:** `16px` (for primary)
- **Font weight:** `600` (semibold)
- **Height (primary):** `52px` (fixed)
- **Shadow (primary):** Yes

**Use for:** Main page actions, forms, navigation.

### Large (lg)

**Specs:**

- **Padding:**
  - Mobile: `px-6 py-3` (24px × 12px)
  - Desktop: `px-8 py-4` (32px × 16px)
- **Text size:** `text-lg` (18px)
- **Font weight:** `600` (semibold)
- **Height (primary):** `52px` (fixed)
- **Shadow (primary):** Yes

**Use for:** Primary page CTA, important actions, landings.

## States

### Default

- Button in normal state
- All visual specs match the variant

### Hover

**General rules:**

- Smooth transition: `transition-all duration-200` (200ms)
- Text/border color change per variant
- Shadow increase for shadow variants (primary, yellow, green-dark)
- Cursor: `pointer`

**Variant-specific:**

- **Primary:** Text → `primary-100`, shadow increases
- **Secondary:** Border → `primary-500`, text → `primary-100`
- **Outline:** Border → `primary-400`, text → `primary-400`
- **Yellow:** Text → `accent/90`, shadow → `shadow-xl`
- **Green Dark:** Text → `primary-200`, shadow → `shadow-xl`

### Active

- Slight background darkening (if applicable)
- Slight scale down (optional)
- Hover effects preserved

### Disabled

**Visual specs:**

- **Opacity:** `0.5` (50%)
- **Cursor:** `not-allowed`
- **Transform:** Disabled (`transform-none`)
- All hover effects disabled
- Shadows remain with reduced opacity

**Behavior:** Button does not respond to clicks; no hover; clearly looks disabled.

### Loading

**Visual specs:**

- Uses `LoadingButton` component
- Spinner overlaid on the original label so width/height stay the same
- Button becomes disabled automatically
- Show delay: `200ms`
- Min display time: `1000ms`

**Behavior:** Prevents double submit, manages disabled state, smooth spinner show/hide.

## Full width (fullWidth)

**Specs:**

- Button takes 100% of container width
- Class `w-full` applied
- Use for mobile UIs and forms

**Use for:** Mobile forms, modals, full-width CTA.

## Typography

### Font

- **Font family:** System font (inherited)
- **Font weight:** `600` (semibold) for all variants
- **Text align:** `center`
- **Letter spacing:** Default

### Text sizes

- **xs/sm:** `14px` (text-sm)
- **md:** `16px` (for primary), default for others
- **lg:** `18px` (text-lg)

## Radius and borders

### Radius

- **All variants:** `rounded-lg` (8px)
- Same for all sizes

### Borders

- **Primary, Yellow, Green Dark:** No border
- **Secondary:** `2px solid` `primary-500/30`
- **Outline:** `2px solid` `primary-500`

## Shadows

### Variants with shadow

**Primary (md/lg):**

- Default: `0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)`
- Hover: `0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)`

**Yellow:**

- Default: `shadow-lg`
- Hover: `shadow-xl`

**Green Dark:**

- Default: `shadow-lg`
- Hover: `shadow-xl`

### Variants without shadow

- **Secondary, Outline, Primary (xs/sm):** No shadow

## Animations and transitions

### Transition

- **Property:** `transition-all`
- **Duration:** `duration-200` (200ms)
- **Timing:** Default (ease)

### Animated properties

- Text color
- Background color
- Border color
- Shadow (for shadow variants)
- Opacity (for disabled)

## Interactivity

### Cursor

- **Default/Hover:** `pointer`
- **Disabled:** `not-allowed`

### Select

- **User select:** `select-none` (text not selectable)

### Focus

- Default browser focus (can improve for accessibility)
- Recommend visible focus ring for keyboard navigation

## Responsiveness

### Responsive padding

- **md:** `px-4 md:px-6 py-2.5 md:py-3`
- **lg:** `px-6 md:px-8 py-3 md:py-4`

### Mobile

- Sufficient touch targets (min 44×44px)
- Full width for forms on mobile
- Responsive text sizes

## Color palette

### Primary colors

- `primary-50`: `#f0f9f6`
- `primary-100`: `#d4ede4` (primary hover text)
- `primary-200`: `#a9dbc9` (green-dark hover text)
- `primary-300`: `#75C9A5`
- `primary-400`: `#5fa88a` (outline hover)
- `primary-500`: `#40916B` (main color)
- `primary-600`: `#40916B`
- `primary-700`: `#2E6F51` (green-dark gradient)
- `primary-800`: `#245a45` (green-dark gradient)
- `primary-900`: `#1a4534`

### Accent colors

- `accent`: `#ec9e1c` (yellow variant)

### Background

- `bg-secondary`: `#F4F4F4` (secondary background)

## Usage examples

### Login form

```tsx
<Button variant="primary" size="md" fullWidth type="submit">
  Sign in
</Button>
```

### Secondary action

```tsx
<Button variant="secondary" size="md">
  Cancel
</Button>
```

### Neutral action

```tsx
<Button variant="outline" size="sm">
  More
</Button>
```

### Loading

```tsx
<LoadingButton loading={isSubmitting} loadingText="Saving..." variant="primary" size="md">
  Save
</LoadingButton>
```

## Accessibility

### Requirements

- All buttons must have accessible text or `aria-label`
- Disabled buttons must have `aria-disabled="true"`
- Loading buttons must have `aria-busy="true"` while loading
- Focus must be visible for keyboard navigation
- Text/background contrast must meet WCAG 2.1 AA (min 4.5:1)

### Recommendations

- Add focus ring for all buttons
- Use semantic HTML (`<button>` not `<div>`)
- Ensure sufficient touch target (min 44×44px)

## Technical details

### Component

- **File:** `core/frontend/ui/Button.tsx`
- **Types:** TypeScript with full typing
- **Dependencies:** React, Tailwind CSS

### Styling

- Tailwind CSS
- Inline styles for primary (shadow and height)
- Other styles via Tailwind classes

### Performance

- Smooth animations (200ms)
- Optimized transitions
- Minimal repaints

## Developer checklist

When creating or changing buttons ensure:

- [ ] Correct variant (primary/secondary/outline/yellow/green-dark)
- [ ] Correct size (xs/sm/md/lg)
- [ ] States (hover/active/disabled) work correctly
- [ ] Animations smooth (200ms)
- [ ] Disabled state visually distinct
- [ ] On mobile button is large enough for touch
- [ ] Contrast meets WCAG 2.1 AA
- [ ] Focus visible for keyboard navigation
- [ ] Correct component (`Button` or `LoadingButton`)
- [ ] For loading use `LoadingButton` with correct props

## Related documents

- [design-system.md](../../frontend/docs/design-system.md) — Design system
- [loading-states.md](./loading-states.md) — Loading state requirements
- [theme/colors.ts](../../../theme/colors.ts) — Project color palette
