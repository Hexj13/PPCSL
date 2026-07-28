---
title: Design system
owner: platform
tags:
  - type/reference
  - domain/engineering
  - scope/core
  - status/active
---

# PPCSL design system

Centralized UI component library for the PPCSL platform.

## Structure

```
ui/
├── design-tokens.ts    # Design tokens (colors, spacing, typography)
├── Button.tsx          # Button component
├── Input.tsx           # Input field component
├── Textarea.tsx        # Textarea component
├── Select.tsx          # Select dropdown component
├── Card.tsx            # Card component
├── Badge.tsx           # Badge component
├── Typography.tsx      # Typography component
├── Heading.tsx         # Heading component
├── Spinner.tsx         # Loading spinner component
├── LoadingButton.tsx   # Button with loading state management
└── index.ts            # Export all components

components/
├── Dropdown.tsx        # Single-select dropdown (optimized with Set lookups)
├── MultiSelectDropdown.tsx  # Multi-select dropdown with search, categories, action buttons
├── SortDropdown.tsx    # Sort dropdown with URL parameter synchronization
├── SearchFilters.tsx   # Advanced search filters component
├── ScrollToFiltersButton.tsx  # Floating button for quick scroll to search filters with return functionality
└── SkeletonContainer.tsx  # Container for skeleton loaders with minimum display time
```

## Usage

### Import Components

```tsx
import { Button, Input, Card, Badge } from '@/ui';
```

### Usage Examples

#### Button

```tsx
<Button variant="primary" size="md">
  Login
</Button>

<Button variant="secondary" size="lg" fullWidth>
  Register
</Button>

<Button variant="outline" disabled>
  Disabled
</Button>
```

Variants: `primary`, `secondary`, `outline-solid`, `yellow`, `green-dark`
Sizes: `sm`, `md`, `lg`

#### LoadingButton

Button component with built-in loading state management. Automatically handles delay (200ms) and minimum display time (1000ms) to prevent flickering.

```tsx
import { LoadingButton } from '@/ui';

<LoadingButton
  loading={isSubmitting}
  loadingText="Saving..."
  type="submit"
>
  Save Changes
</LoadingButton>
```

**Features:**
- Automatic delay before showing loader (200ms)
- Minimum display time (1000ms) to prevent flickering
- Built-in spinner (can be hidden with `showSpinner={false}`)
- Automatic disabled state during loading
- Prevents double-clicks during loading

**Props:**
- `loading?: boolean` - Loading state
- `loadingText?: string` - Text to show during loading (replaces children)
- `showSpinner?: boolean` - Show/hide spinner (default: `true`)
- `spinnerSize?: 'sm' | 'md' | 'lg'` - Spinner size (default: `'sm'`)
- All standard button props are supported

#### Input

```tsx
<Input
  label="Email"
  type="email"
  placeholder="example@email.com"
  error={errors.email}
  helperText="Enter a valid email address"
/>
```

#### Select

```tsx
<Select
  label="City"
  options={[
    { value: 'skopje', label: 'Skopje' },
    { value: 'bitola', label: 'Bitola' },
  ]}
  error={errors.city}
/>
```

#### Card

```tsx
<Card hover>
  <h3>Title</h3>
  <p>Card content</p>
</Card>
```

#### Badge

```tsx
<Badge variant="success" size="md">
  Active
</Badge>
```

Variants: `primary`, `success`, `warning`, `error`, `info`, `neutral`
Sizes: `sm`, `md`, `lg`

#### Typography and Heading

```tsx
<Heading level={1} gradient>
  Main Title
</Heading>

<Typography variant="body">
  Regular text
</Typography>
```

## Design Tokens

Design tokens are available through `designTokens`:

```tsx
import { designTokens } from '@/ui';
import { loadThemeSync } from '@/lib/theme';

const spacing = designTokens.spacing.md;
const theme = loadThemeSync('md');
const primaryColor = theme.primary[500];
```

## Color Palette

- **Primary**: Green palette (`#00ff88` main)
- **Background**: Dark green shades (`#1a2e2a`, `#233d37`, `#152520`)
- **Semantic**: Success, Error, Warning, Info

## Styling

All components use Tailwind CSS and existing classes from `globals.css`. Components are fully compatible with the current project styling system.

## Additional Components

### Dropdown Components

The project includes optimized dropdown components in `components/`:

- **Dropdown**: Single-select dropdown with optional search, action buttons, and optional `clearOption` (first menu item + divider; used for optional clearable fields such as listing form selects and search year From/To)
- **MultiSelectDropdown**: Multi-select dropdown with:
  - Search functionality
  - Category grouping
  - Action buttons (OK/Reset) for batch selection
  - Set-based lookups for O(1) performance
- **SortDropdown**: Sort dropdown component with URL parameter synchronization for listing sorting

These components are optimized for performance using Set-based lookups instead of Array.includes() for better scalability with large option lists.

### ScrollToFiltersButton

A floating action button that appears when users scroll past the search filters section. Provides quick navigation back to filters and remembers scroll position for return navigation.

**Features:**
- Appears when filters are scrolled out of view
- Smooth scroll animation to filters
- Remembers scroll position for return navigation
- Responsive design (mobile and desktop)
- Tooltip on desktop (hidden on mobile)
- Matches primary button styling (`#31a55f`)

**Usage:**

```tsx
import { ScrollToFiltersButton } from '@/components/search/ScrollToFiltersButton';

// On the homepage with search filters
<ScrollToFiltersButton />
```

**Behavior:**
- Shows filter icon when scrolled past filters
- Shows down arrow when at filters (allows return to previous position)
- Automatically hides when not needed
- Smooth scroll animations with offset for better UX

### SkeletonContainer

Container component for skeleton loaders that ensures minimum display time to prevent flickering. Uses `useLoadingState` hook internally with `immediate: true` for instant display.

**Usage:**

```tsx
import { SkeletonContainer } from '@/components/SkeletonContainer';
import { ListingCardSkeleton } from '@/components/listing/ListingCardSkeleton';

{loading ? (
  <SkeletonContainer isLoading={loading}>
    <ListingCardSkeleton />
    <ListingCardSkeleton />
    <ListingCardSkeleton />
  </SkeletonContainer>
) : (
  <ListingGrid listings={listings} />
)}
```

**Features:**
- Immediate display (no delay)
- Minimum display time (default: 1000ms, configurable)
- Prevents skeleton flickering on fast API responses
- Automatically handles cleanup

**Props:**
- `isLoading: boolean` - Loading state
- `minDisplayTime?: number` - Minimum display time in ms (default: `1000`)

### Loading State Management

The project uses a unified loading state management system with the `useLoadingState` hook.

**Hook: `useLoadingState`**

Universal hook for managing loading states with configurable delay and minimum display time.

```tsx
import { useLoadingState } from '@/hooks/useLoadingState';

const { visible, afterHidden } = useLoadingState({
  isLoading: loading,
  showDelay: 200,        // Delay before showing (default: 200ms)
  minDisplayTime: 1000,  // Minimum display time (default: 1000ms)
  immediate: false,       // Show immediately (default: false)
});

// Use visible to control UI
{visible && <Spinner />}

// Coordinate side effects (e.g., toast notifications)
afterHidden(() => {
  toast.success('Operation completed');
});
```

**Features:**
- Prevents flickering with configurable delay
- Ensures minimum display time for smooth UX
- Supports immediate display for skeletons
- Provides `afterHidden` callback for coordinating side effects
- Automatic cleanup on unmount

**Use Cases:**
- Button loaders: Use `LoadingButton` component (wraps `useLoadingState`)
- Skeleton loaders: Use `SkeletonContainer` component (wraps `useLoadingState` with `immediate: true`)
- Custom loaders: Use `useLoadingState` hook directly

For detailed requirements and best practices, see [`loading-states.md`](../../docs/loading-states.md).

## Interactive Documentation

Visit `/design-system` route in the application to see interactive component documentation.

