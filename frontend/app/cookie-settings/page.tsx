'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { useCookieConsent } from '@/hooks/useCookieConsent';

export default function CookieSettingsPage() {
  const { consent, isLoading, grantConsent, denyConsent } = useCookieConsent();
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => setShowSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  const handleSave = (newConsent: 'granted' | 'denied') => {
    setIsSaving(true);
    if (newConsent === 'granted') {
      grantConsent();
    } else {
      denyConsent();
    }
    setTimeout(() => {
      setIsSaving(false);
      setShowSuccess(true);
    }, 300);
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="surface p-8 text-center">
          <p className="text-gray-400">Вчитување...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-primary-500 to-primary-600 bg-clip-text text-transparent mb-4">
          Настройки за cookies
        </h1>
        <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
          Овде можете да управувате со вашите преференци за cookies. Cookies се мали датотеки кои се
          чуваат на вашиот уред и ни помагаат да ја подобриме вашата корисничка средина, да
          анализираме употреба на веб-сајтот и да обезбедиме релевантна содржина.
        </p>
      </div>

      {showSuccess && (
        <div className="surface border-2 border-[#31A55F] bg-[#31A55F]/10 p-4 mb-6 rounded-lg">
          <p className="text-[#31A55F] font-medium">✓ Вашите преференци се зачувани успешно</p>
        </div>
      )}

      <div className="surface mb-6">
        <h2 className="text-2xl font-bold mb-4">Неопходни cookies</h2>
        <p className="text-gray-300 text-sm mb-4 leading-relaxed">
          Овие cookies се неопходни за функционирање на веб-сајтот и не можат да се оневозможат. Тие
          вклучуваат cookies за сесија, безбедност и основна функционалност на платформата.
        </p>
        <div className="bg-bg-darker p-3 rounded-lg">
          <p className="text-gray-400 text-sm">
            Статус: <span className="text-[#31A55F]">Активни</span>
          </p>
        </div>
      </div>

      <div className="surface mb-6">
        <h2 className="text-2xl font-bold mb-4">Аналитички cookies</h2>
        <p className="text-gray-300 text-sm mb-4 leading-relaxed">
          Овие cookies ни помагаат да разбереме како посетителите ја користат нашата веб-страница,
          собирајќи информации анонимно. Ова ни помага да ја подобриме функционалноста и
          корисничкото искуство.
        </p>
        <div className="space-y-4">
          <div className="bg-bg-darker p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-semibold text-white mb-1">Google Analytics</h3>
                <p className="text-gray-400 text-xs">
                  Користиме Google Analytics за анализирање на употребата на веб-сајтот
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-sm font-medium ${
                    consent === 'granted' ? 'text-[#31A55F]' : 'text-gray-500'
                  }`}
                >
                  {consent === 'granted' ? 'Активни' : 'Неактивни'}
                </span>
              </div>
            </div>
          </div>
          <div className="bg-bg-darker p-4 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-semibold text-white mb-1">Google Tag Manager</h3>
                <p className="text-gray-400 text-xs">
                  Користиме Google Tag Manager за управување со тагови и скрипти
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-sm font-medium ${
                    consent === 'granted' ? 'text-[#31A55F]' : 'text-gray-500'
                  }`}
                >
                  {consent === 'granted' ? 'Активни' : 'Неактивни'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="surface mb-6">
        <h2 className="text-2xl font-bold mb-4">Вашиот избор</h2>
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={() => handleSave('granted')}
            disabled={isSaving || consent === 'granted'}
            className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
              consent === 'granted'
                ? 'bg-[#31A55F] text-white cursor-not-allowed'
                : 'bg-bg-darker hover:bg-bg-darker/80 text-white border-2 border-primary-500/30 hover:border-primary-500/50'
            }`}
          >
            {isSaving ? 'Зачувување...' : 'Прифати аналитички cookies'}
          </button>
          <button
            onClick={() => handleSave('denied')}
            disabled={isSaving || consent === 'denied'}
            className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
              consent === 'denied'
                ? 'bg-gray-600 text-white cursor-not-allowed'
                : 'bg-bg-darker hover:bg-bg-darker/80 text-white border-2 border-primary-500/30 hover:border-primary-500/50'
            }`}
          >
            {isSaving ? 'Зачувување...' : 'Одбиј аналитички cookies'}
          </button>
        </div>
      </div>

      <div className="surface">
        <h2 className="text-2xl font-bold mb-4">Повеќе информации</h2>
        <p className="text-gray-300 text-sm mb-4 leading-relaxed">
          За повеќе информации за тоа како ги користиме cookies и како ги заштитуваме вашите
          податоци, ве молиме прочитајте ја нашата{' '}
          <Link
            href="/privacy"
            className="text-primary-400 hover:text-primary-300 underline transition-colors"
          >
            Политика за приватност
          </Link>
          .
        </p>
        <p className="text-gray-400 text-xs">
          Вашите преференци се зачувани во вашиот прелистувач и ќе останат активни 365 дена. Можете
          да ги промените во секое време од оваа страница.
        </p>
      </div>
    </div>
  );
}
