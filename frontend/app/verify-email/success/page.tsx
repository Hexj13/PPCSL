'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function VerifyEmailSuccessPage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(10);

  useEffect(() => {
    if (countdown <= 0) {
      router.push('/');
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown, router]);

  return (
    <div className="max-w-md mx-auto mt-6 md:mt-12">
      <div className="card p-6 md:p-8 text-center">
        <div className="mb-4">
          <svg
            className="w-16 h-16 mx-auto text-primary-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-4 text-primary-400">
          Email адресата е успешно потврдена
        </h1>
        <p className="text-gray-300 mb-6">
          Вашата email адреса е успешно потврдена. Сега можете да ги користите сите функции на
          платформата.
        </p>
        <Link href="/" className="btn-primary w-full block">
          На главна
        </Link>
        <p className="text-sm text-gray-400 mt-4">
          Автоматски пренасочување за {countdown} секунди...
        </p>
      </div>
    </div>
  );
}
