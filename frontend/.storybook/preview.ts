import type { Preview } from '@storybook/nextjs-vite';
import '../app/globals.css';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: 'dark',
      values: [
        {
          name: 'dark',
          value: '#1a2e2a',
        },
        {
          name: 'darker',
          value: '#152520',
        },
        {
          name: 'light',
          value: '#233d37',
        },
      ],
    },
    a11y: {
      test: 'todo',
    },
  },
};

export default preview;
