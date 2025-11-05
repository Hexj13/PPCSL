import type { Meta, StoryObj } from '@storybook/react';
import { Card } from './Card';
import { Typography } from './Typography';
import { Heading } from './Heading';

const meta: Meta<typeof Card> = {
  title: 'Design System/Card',
  component: Card,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Card component for displaying content in a contained card.',
      },
    },
  },
  argTypes: {
    hover: {
      control: 'boolean',
      description: 'Enable hover effect',
    },
    children: {
      control: 'text',
      description: 'Card content',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  args: {
    children: (
      <div className="p-6">
        <Heading level={3} className="mb-2">
          Card Title
        </Heading>
        <Typography variant="body">This is a regular card without hover effect.</Typography>
      </div>
    ),
  },
};

export const WithHover: Story = {
  args: {
    hover: true,
    children: (
      <div className="p-6">
        <Heading level={3} className="mb-2">
          Card with Hover
        </Heading>
        <Typography variant="body">This card has a hover effect enabled.</Typography>
      </div>
    ),
  },
};

export const Multiple: Story = {
  render: () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <Card hover>
        <div className="p-6">
          <Heading level={3} className="mb-2">
            Card 1
          </Heading>
          <Typography variant="body">Card content</Typography>
        </div>
      </Card>
      <Card hover>
        <div className="p-6">
          <Heading level={3} className="mb-2">
            Card 2
          </Heading>
          <Typography variant="body">Card content</Typography>
        </div>
      </Card>
      <Card hover>
        <div className="p-6">
          <Heading level={3} className="mb-2">
            Card 3
          </Heading>
          <Typography variant="body">Card content</Typography>
        </div>
      </Card>
    </div>
  ),
};
