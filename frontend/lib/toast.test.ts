import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockHotToast = jest.fn(() => 'toast-id');
const mockHotToastSuccess = jest.fn(() => 'toast-id');
const mockHotToastError = jest.fn(() => 'toast-id');

jest.mock('react-hot-toast', () => {
  const fn = (...args: unknown[]) => mockHotToast(...args);
  return {
    __esModule: true,
    default: Object.assign(fn, {
      success: (...args: unknown[]) => mockHotToastSuccess(...args),
      error: (...args: unknown[]) => mockHotToastError(...args),
      loading: jest.fn(),
      custom: jest.fn(),
      promise: jest.fn(),
      dismiss: jest.fn(),
      dismissAll: jest.fn(),
      remove: jest.fn(),
      removeAll: jest.fn(),
    }),
  };
});

jest.mock('@/lib/theme', () => ({
  loadThemeSync: () => ({
    semantic: {
      success: '#40916B',
      error: '#DC3545',
      warning: '#FFC107',
    },
  }),
}));

import { toast } from '@/lib/toast';
import { toastClassNames } from '@/lib/toast-options';

describe('toast className', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes full success className including layout and E2E marker', () => {
    toast.success('Added to comparison');

    expect(mockHotToastSuccess).toHaveBeenCalledTimes(1);
    const options = mockHotToastSuccess.mock.calls[0]?.[1] as { className?: string } | undefined;
    expect(options?.className).toBe(toastClassNames.success);
    expect(options?.className).toContain('kupito-toast');
    expect(options?.className).toContain('kupito-toast--success');
    expect(options?.className).toContain('!min-w-[320px]');
    expect(options?.className).toContain('!max-w-[400px]');
    expect(options?.className).toContain('!bg-bg-card');
  });

  it('passes full error className including layout and E2E marker', () => {
    toast.error('Something went wrong');

    expect(mockHotToastError).toHaveBeenCalledTimes(1);
    const options = mockHotToastError.mock.calls[0]?.[1] as { className?: string } | undefined;
    expect(options?.className).toBe(toastClassNames.error);
    expect(options?.className).toContain('kupito-toast--error');
    expect(options?.className).toContain('!min-w-[320px]');
  });

  it('passes full warning className including layout and E2E marker', () => {
    toast.warning('Compare limit reached');

    expect(mockHotToast).toHaveBeenCalledTimes(1);
    const options = mockHotToast.mock.calls[0]?.[1] as { className?: string } | undefined;
    expect(options?.className).toBe(toastClassNames.warning);
    expect(options?.className).toContain('kupito-toast--warning');
    expect(options?.className).toContain('!min-w-[320px]');
  });

  it('fills missing default classes when caller className only includes the base marker', () => {
    toast.success('Saved', { className: 'kupito-toast custom-extra' });

    const options = mockHotToastSuccess.mock.calls[0]?.[1] as { className?: string } | undefined;
    expect(options?.className).toContain('kupito-toast custom-extra');
    expect(options?.className).toContain('kupito-toast--success');
    expect(options?.className).toContain('!min-w-[320px]');
  });

  it('preserves caller className when it already includes the full default className', () => {
    toast.success('Saved', { className: `${toastClassNames.success} custom-extra` });

    const options = mockHotToastSuccess.mock.calls[0]?.[1] as { className?: string } | undefined;
    expect(options?.className).toBe(`${toastClassNames.success} custom-extra`);
  });

  it('merges caller className with default variant className', () => {
    toast.success('Saved', { className: 'custom-extra' });

    const options = mockHotToastSuccess.mock.calls[0]?.[1] as { className?: string } | undefined;
    expect(options?.className).toBe(`${toastClassNames.success} custom-extra`);
  });
});
