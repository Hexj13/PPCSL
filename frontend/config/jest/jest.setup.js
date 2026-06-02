require('@testing-library/jest-dom');
require('@testing-library/jest-dom/jest-globals');

// Auto-import React for JSX
global.React = require('react');

const { randomUUID } = require('crypto');
if (!global.crypto.randomUUID) {
  global.crypto.randomUUID = randomUUID;
}

if (!URL.createObjectURL) {
  URL.createObjectURL = jest.fn(() => 'blob:mock-preview');
}
if (!URL.revokeObjectURL) {
  URL.revokeObjectURL = jest.fn();
}

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}


