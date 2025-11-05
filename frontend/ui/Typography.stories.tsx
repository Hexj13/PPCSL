import type { Meta, StoryObj } from '@storybook/react';
import { Typography } from './Typography';

const meta: Meta<typeof Typography> = {
  title: 'Design System/Typography',
  component: Typography,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: 'Typography component for text content.',
      },
    },
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['body', 'small', 'caption'],
      description: 'Text variant',
    },
    as: {
      control: 'select',
      options: ['p', 'span', 'div'],
      description: 'HTML element',
    },
    children: {
      control: 'text',
      description: 'Text content',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Typography>;

export const Body: Story = {
  args: {
    variant: 'body',
    children: 'Body text - Regular paragraph text for content',
  },
};

export const Small: Story = {
  args: {
    variant: 'small',
    children: 'Small text - For secondary information',
  },
};

export const Caption: Story = {
  args: {
    variant: 'caption',
    children: 'Caption text - For labels and metadata',
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="space-y-4">
      <Typography variant="body">Body text - Regular paragraph text for content</Typography>
      <Typography variant="small">Small text - For secondary information</Typography>
      <Typography variant="caption">Caption text - For labels and metadata</Typography>
    </div>
  ),
};
