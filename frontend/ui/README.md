# Kupito Design System

Centralized UI component library for the Kupito project.

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

const primaryColor = designTokens.colors.primary[500];
const spacing = designTokens.spacing.md;
```

## Color Palette

- **Primary**: Green palette (#00ff88 main)
- **Background**: Dark green shades (#1a2e2a, #233d37, #152520)
- **Semantic**: Success, Error, Warning, Info

## Styling

All components use Tailwind CSS and existing classes from `globals.css`. Components are fully compatible with the current project styling system.

## Interactive Documentation

Visit `/design-system` route in the application to see interactive component documentation.
