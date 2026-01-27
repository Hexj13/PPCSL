import type { Meta, StoryObj } from '@storybook/react';

import { Select } from './Select';

const meta: Meta<typeof Select> = {
  title: 'Design System/Select',
  component: Select,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Select dropdown component with label, error, and helper text support.',
      },
    },
  },
  argTypes: {
    label: {
      control: 'text',
      description: 'Select label',
    },
    options: {
      control: 'object',
      description: 'Select options',
    },
    error: {
      control: 'text',
      description: 'Error message',
    },
    helperText: {
      control: 'text',
      description: 'Helper text',
    },
    disabled: {
      control: 'boolean',
      description: 'Disable select',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Select>;

export const Default: Story = {
  args: {
    label: 'City',
    options: [
      { value: '', label: 'Select a city' },
      { value: 'skopje', label: 'Skopje' },
      { value: 'bitola', label: 'Bitola' },
      { value: 'ohrid', label: 'Ohrid' },
    ],
  },
};

export const WithError: Story = {
  args: {
    label: 'City',
    options: [
      { value: '', label: 'Select a city' },
      { value: 'skopje', label: 'Skopje' },
    ],
    error: 'This field is required',
  },
};

export const Disabled: Story = {
  args: {
    label: 'City',
    options: [
      { value: '', label: 'Select a city' },
      { value: 'skopje', label: 'Skopje' },
    ],
    disabled: true,
  },
};
