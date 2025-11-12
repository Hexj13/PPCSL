# Storybook Setup (Alternative)

If you want to use Storybook for more advanced component documentation, follow these steps:

## Installation

```bash
cd frontend
npx storybook@latest init
```

This will:
- Install Storybook and its dependencies
- Add scripts to `package.json`
- Create a `.storybook` folder with configuration

## Benefits of Storybook

- **Interactive Controls**: Test components with different props in real-time
- **Documentation**: Write markdown documentation alongside components
- **Addons**: Install addons for accessibility testing, viewport testing, etc.
- **Isolation**: View components in isolation without app context
- **Export**: Generate static documentation site

## Usage

After installation:

```bash
npm run storybook
```

Stories should be created in `ui/*.stories.tsx` files.

## Example Story

```tsx
// ui/Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Button',
  },
};
```

## Note

The current implementation uses a Next.js page at `/design-system` which is simpler and doesn't require additional dependencies. Storybook is recommended if you need more advanced features like:
- Interactive prop controls
- Multiple viewports
- Accessibility testing
- Component composition testing

