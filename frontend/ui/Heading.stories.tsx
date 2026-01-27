import type { Meta, StoryObj } from '@storybook/react';

import { Heading } from './Heading';

const meta: Meta<typeof Heading> = {
  title: 'Design System/Heading',
  component: Heading,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Heading component with multiple levels and gradient option.',
      },
    },
  },
  argTypes: {
    level: {
      control: 'select',
      options: [1, 2, 3, 4, 5, 6],
      description: 'Heading level (h1-h6)',
    },
    gradient: {
      control: 'boolean',
      description: 'Apply gradient color',
    },
    children: {
      control: 'text',
      description: 'Heading text',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Heading>;

export const H1: Story = {
  args: {
    level: 1,
    children: 'Heading 1',
  },
};

export const H2: Story = {
  args: {
    level: 2,
    children: 'Heading 2',
  },
};

export const H3: Story = {
  args: {
    level: 3,
    children: 'Heading 3',
  },
};

export const WithGradient: Story = {
  args: {
    level: 1,
    gradient: true,
    children: 'Gradient Heading',
  },
};

export const AllLevels: Story = {
  render: () => (
    <div className="space-y-4">
      <Heading level={1}>Heading 1</Heading>
      <Heading level={2}>Heading 2</Heading>
      <Heading level={3}>Heading 3</Heading>
      <Heading level={4}>Heading 4</Heading>
      <Heading level={5}>Heading 5</Heading>
      <Heading level={6}>Heading 6</Heading>
    </div>
  ),
};
