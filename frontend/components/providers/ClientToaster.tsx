'use client';

import { useEffect, useState, type ComponentProps } from 'react';
import { Toaster } from 'react-hot-toast';

type ClientToasterProps = ComponentProps<typeof Toaster>;

export function ClientToaster(props: ClientToasterProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return <Toaster {...props} />;
}
