import type { Meta, StoryObj } from '@storybook/react';
import { Spinner } from './Spinner';

const meta: Meta<typeof Spinner> = {
  title: 'Design System/Spinner',
  component: Spinner,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Loading spinner component with different sizes.',
      },
    },
  },
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'Spinner size',
    },
    text: {
      control: 'text',
      description: 'Loading text',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Spinner>;

export const Small: Story = {
  args: {
    size: 'sm',
  },
};

export const Medium: Story = {
  args: {
    size: 'md',
  },
};

export const Large: Story = {
  args: {
    size: 'lg',
  },
};

export const WithText: Story = {
  args: {
    size: 'md',
    text: 'Loading...',
  },
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-wrap gap-8 items-center">
      <div className="text-center">
        <Spinner size="sm" />
        <p className="mt-2 text-sm text-gray-300">Small</p>
      </div>
      <div className="text-center">
        <Spinner size="md" />
        <p className="mt-2 text-sm text-gray-300">Medium</p>
      </div>
      <div className="text-center">
        <Spinner size="lg" />
        <p className="mt-2 text-sm text-gray-300">Large</p>
      </div>
    </div>
  ),
};
