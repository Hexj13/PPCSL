'use client';

import Link from 'next/link';

export default function Error({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-bg-dark to-bg-darker flex items-center justify-center px-4">
      <div className="text-center max-w-2xl w-full">
        <div className="mb-8">
          <div className="mb-6">
            <svg
              className="w-16 h-16 md:w-20 md:h-20 mx-auto text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-gray-300 mb-4">
            Нешто не е во ред
          </h1>
          <p className="text-gray-400 text-base mb-2">
            Настана грешка при вчитување на страницата.
          </p>
          <p className="text-gray-400 text-sm mb-8">
            Ве молиме обидете се повторно или контактирајте не подоцна ако проблемот продолжи.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button onClick={reset} className="btn-primary px-6 py-2.5 text-base font-semibold">
            Обиди се повторно
          </button>
          <Link href="/" className="btn-outline px-6 py-2.5 text-base font-semibold">
            Кон почетна
          </Link>
        </div>
      </div>
    </div>
  );
}
