---
title: Storybook setup
owner: platform
tags:
  - type/guide
  - domain/engineering
  - scope/core
  - status/active
---

# Storybook

Storybook is installed in `core/frontend` (`.storybook/`, Storybook 10, Next.js Vite framework). Use it for isolated UI review and a11y checks alongside the `/design-system` page.

## Run

From `core/frontend`:

```bash
npm run storybook
# or without the info wrapper:
npm run storybook:dev
```

Static build:

```bash
npm run build-storybook
```

Default dev URL: `http://localhost:6006`.

## Stories

Stories live next to components (for example under `ui/` and feature folders) as `*.stories.tsx`. Existing addons include docs, a11y, and onboarding.

## Example

```tsx
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

The `/design-system` Next.js page remains available for a lighter in-app palette/component check. Prefer Storybook when you need interactive controls, viewports, or accessibility tooling.
