'use client';

import { useEffect, useState, type ComponentProps } from 'react';
import { Toaster } from 'react-hot-toast';

import { defaultClientToastOptions } from '@/lib/toast-options';
import { designTokens } from '@/ui';

type ClientToasterProps = ComponentProps<typeof Toaster>;

export function ClientToaster(props: ClientToasterProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <Toaster
      {...props}
      position={props.position ?? 'top-right'}
      containerStyle={{
        top: '80px',
        zIndex: designTokens.zIndex.toast,
        ...props.containerStyle,
      }}
      toastOptions={{
        ...defaultClientToastOptions,
        ...props.toastOptions,
        style: { ...defaultClientToastOptions.style, ...props.toastOptions?.style },
        success: {
          ...defaultClientToastOptions.success,
          ...props.toastOptions?.success,
          style: {
            ...defaultClientToastOptions.success?.style,
            ...props.toastOptions?.success?.style,
          },
        },
        error: {
          ...defaultClientToastOptions.error,
          ...props.toastOptions?.error,
          style: {
            ...defaultClientToastOptions.error?.style,
            ...props.toastOptions?.error?.style,
          },
        },
      }}
    />
  );
}
