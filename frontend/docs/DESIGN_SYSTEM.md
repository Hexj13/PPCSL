# PPCSL Design System

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
└── index.ts            # Export all components

components/
├── Dropdown.tsx        # Single-select dropdown (optimized with Set lookups)
├── MultiSelectDropdown.tsx  # Multi-select dropdown with search, categories, action buttons
├── SortDropdown.tsx    # Sort dropdown with URL parameter synchronization
├── SearchFilters.tsx   # Advanced search filters component
└── ScrollToFiltersButton.tsx  # Floating button for quick scroll to search filters with return functionality
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

Variants: `primary`, `secondary`, `outline`, `yellow`, `green-dark`
Sizes: `sm`, `md`, `lg`

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
import { getTheme } from '@/lib/theme';

const spacing = designTokens.spacing.md;
const theme = getTheme();
const primaryColor = theme.primary[500];
```

## Color Palette

- **Primary**: Green palette (#00ff88 main)
- **Background**: Dark green shades (#1a2e2a, #233d37, #152520)
- **Semantic**: Success, Error, Warning, Info

## Styling

All components use Tailwind CSS and existing classes from `globals.css`. Components are fully compatible with the current project styling system.

## Additional Components

### Dropdown Components

The project includes optimized dropdown components in `components/`:

- **Dropdown**: Single-select dropdown with optional search and action buttons
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
- Matches primary button styling (#31a55f)

**Usage:**

```tsx
import { ScrollToFiltersButton } from '@/components/ScrollToFiltersButton';

// On the homepage with search filters
<ScrollToFiltersButton />
```

**Behavior:**
- Shows filter icon when scrolled past filters
- Shows down arrow when at filters (allows return to previous position)
- Automatically hides when not needed
- Smooth scroll animations with offset for better UX

## Interactive Documentation

Visit `/design-system` route in the application to see interactive component documentation.

