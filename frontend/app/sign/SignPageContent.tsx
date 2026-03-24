'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useRef } from 'react';

import { LoginForm } from '@/app/login/LoginForm';
import { useLoginPage } from '@/app/login/useLoginPage';
import { RegisterPanel } from '@/app/register/RegisterPanel';
import { useTabIndicator } from '@/hooks/useTabIndicator';
import { useTranslation } from '@/hooks/useTranslation';
import { analytics } from '@/lib/analytics';

export type AuthTab = 'login' | 'register';

export function SignPageContent() {
  const { t } = useTranslation();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tab: AuthTab = searchParams.get('tab') === 'register' ? 'register' : 'login';

  const loginTabRef = useRef<HTMLButtonElement>(null);
  const registerTabRef = useRef<HTMLButtonElement>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  const { indicatorRef, indicatorStyle } = useTabIndicator(
    tab,
    { login: loginTabRef, register: registerTabRef },
    tabsContainerRef,
  );

  const login = useLoginPage();

  const handleTabClick = (next: AuthTab) => {
    if (next === tab) return;
    analytics.authTabSelect(next);
    router.replace(next === 'register' ? '/sign?tab=register' : '/sign', { scroll: false });
  };

  if (login.isInitialized && login.user) {
    return null;
  }

  return (
    <div className="max-w-md mx-auto mt-6 md:mt-12 mb-16">
      <h1 className="text-3xl md:text-4xl font-extrabold mb-6 text-center text-primary-900">
        {t('sign.greeting')}
      </h1>
      <div className="card p-0 overflow-hidden">
        <div
          ref={tabsContainerRef}
          className="relative flex w-full border-b border-primary-700/25"
          role="tablist"
          aria-label={t('sign.pageTitle')}
        >
          <button
            ref={loginTabRef}
            type="button"
            role="tab"
            aria-selected={tab === 'login'}
            id="sign-tab-login"
            className={`flex-1 px-4 py-3 text-sm md:text-base font-semibold transition-all duration-300 ease-in-out relative z-10 text-primary-900 ${
              tab === 'login'
                ? 'bg-primary-500/10 rounded-tl-lg'
                : 'hover-only:hover:bg-primary-500/10'
            }`}
            onClick={() => handleTabClick('login')}
          >
            {t('login.title')}
          </button>
          <button
            ref={registerTabRef}
            type="button"
            role="tab"
            aria-selected={tab === 'register'}
            id="sign-tab-register"
            className={`flex-1 px-4 py-3 text-sm md:text-base font-semibold transition-all duration-300 ease-in-out relative z-10 text-primary-900 ${
              tab === 'register'
                ? 'bg-primary-500/10 rounded-tr-lg'
                : 'hover-only:hover:bg-primary-500/10'
            }`}
            onClick={() => handleTabClick('register')}
          >
            {t('register.title')}
          </button>
          <div
            ref={indicatorRef}
            className="pointer-events-none absolute bottom-0 h-0.5 bg-primary-700 transition-all duration-300 ease-in-out z-20"
            style={{
              left: `${indicatorStyle.left}px`,
              width: `${indicatorStyle.width}px`,
            }}
          />
        </div>

        <div
          id="sign-panel-login"
          role="tabpanel"
          aria-labelledby="sign-tab-login"
          hidden={tab !== 'login'}
          className={tab === 'login' ? 'block' : 'hidden'}
        >
          <LoginForm
            t={login.t}
            formData={login.formData}
            setFormData={login.setFormData}
            setErrors={login.setErrors}
            loading={login.loading}
            errors={login.errors}
            showPassword={login.showPassword}
            setShowPassword={login.setShowPassword}
            handleFormFieldFocus={login.handleFormFieldFocus}
            handleSubmit={login.handleSubmit}
            showTitle={false}
            showRegisterLink={false}
            formClassName="p-6 md:p-8"
          />
        </div>

        <div
          id="sign-panel-register"
          role="tabpanel"
          aria-labelledby="sign-tab-register"
          hidden={tab !== 'register'}
          className={tab === 'register' ? 'block' : 'hidden'}
        >
          <RegisterPanel showTitle={false} showLoginLink={false} formClassName="p-6 md:p-8" />
        </div>
      </div>
    </div>
  );
}
