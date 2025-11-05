import type { Meta, StoryObj } from '@storybook/react';
import { Badge } from './Badge';

const meta: Meta<typeof Badge> = {
  title: 'Design System/Badge',
  component: Badge,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Badge component for displaying status indicators.',
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'success', 'warning', 'error', 'info', 'neutral'],
      description: 'Badge variant',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Badge size',
    },
    children: {
      control: 'text',
      description: 'Badge content',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Primary',
  },
};

export const Success: Story = {
  args: {
    variant: 'success',
    children: 'Success',
  },
};

export const Warning: Story = {
  args: {
    variant: 'warning',
    children: 'Warning',
  },
};

export const Error: Story = {
  args: {
    variant: 'error',
    children: 'Error',
  },
};

export const Info: Story = {
  args: {
    variant: 'info',
    children: 'Info',
  },
};

export const Neutral: Story = {
  args: {
    variant: 'neutral',
    children: 'Neutral',
  },
};

export const Sizes: Story = {
  render: () => (
    <div className="flex flex-wrap gap-4 items-center">
      <Badge variant="success" size="sm">
        Small
      </Badge>
      <Badge variant="success" size="md">
        Medium
      </Badge>
      <Badge variant="success" size="lg">
        Large
      </Badge>
    </div>
  ),
};
