'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

export function RegisterPageBodyClass() {
  const pathname = usePathname();
  const isRegisterPage = pathname === '/register';

  useEffect(() => {
    if (isRegisterPage) {
      document.body.classList.add('register-page');
    } else {
      document.body.classList.remove('register-page');
    }

    return () => {
      document.body.classList.remove('register-page');
    };
  }, [isRegisterPage]);

  return null;
}
