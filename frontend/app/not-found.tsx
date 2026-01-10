import Image from 'next/image';
import Link from 'next/link';

import { loadTranslations } from '@/lib/i18n';

const translations = loadTranslations();

export default function NotFound() {
  return (
    <div className="fixed inset-0 bg-bg-dark flex items-center justify-center px-4 z-50">
      <div className="text-center max-w-2xl w-full">
        <div className="mb-8">
          <div className="mb-1 flex justify-center">
            <Image
              src="/eye-of-providence.png"
              alt={translations.notFound.imageAlt}
              width={64}
              height={64}
              className="w-16 h-16"
              draggable={false}
            />
          </div>
          <h1 className="text-6xl md:text-7xl font-extrabold bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent mb-4">
            {translations.notFound.title}
          </h1>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-300 mb-4">
            {translations.notFound.heading}
          </h2>
          <p className="text-gray-400 text-base mb-8">{translations.notFound.description}</p>
        </div>

        <div className="flex justify-center">
          <Link
            href="/"
            className="text-primary-400 font-medium text-sm md:text-base hover:text-primary-500 transition-colors duration-200 whitespace-nowrap flex items-center justify-center gap-2 px-6 py-2.5 text-base rounded-lg border-2 border-primary-400/20 hover:border-primary-400/40 bg-primary-500/10 hover:bg-primary-500/20"
          >
            {translations.notFound.backToHome}
          </Link>
        </div>
      </div>
    </div>
  );
}
