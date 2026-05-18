'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import Script from 'next/script';
import { useEffect, useMemo, useRef, useState } from 'react';

import { LoginForm } from '@/app/login/LoginForm';
import { useLoginPage } from '@/app/login/useLoginPage';
import { RegisterPanel } from '@/app/register/RegisterPanel';
import { useRegisterPage } from '@/app/register/useRegisterPage';
import { GoogleSignInButton } from '@/app/sign/GoogleSignInButton';
import { useGoogleAuth } from '@/app/sign/useGoogleAuth';
import { useI18n } from '@/components/providers/I18nProvider';
import { useTabIndicator } from '@/hooks/useTabIndicator';
import { useTranslation } from '@/hooks/useTranslation';
import { analytics } from '@/lib/analytics';
import { buildSignPageHref, getReturnUrlFromSearchParams } from '@/lib/return-url';
import { Spinner } from '@/ui';

export type AuthTab = 'login' | 'register';

function gisScriptHl(locale: string): string {
  const low = locale.toLowerCase();
  if (low === 'ro') return 'ro';
  if (low === 'ru') return 'ru';
  return 'en';
}

export function SignPageContent() {
  const { t } = useTranslation();
  const { locale } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = getReturnUrlFromSearchParams(searchParams);
  const tab: AuthTab = searchParams.get('tab') === 'register' ? 'register' : 'login';

  const loginTabRef = useRef<HTMLButtonElement>(null);
  const registerTabRef = useRef<HTMLButtonElement>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  const { indicatorRef, indicatorStyle } = useTabIndicator(
    tab,
    { login: loginTabRef, register: registerTabRef },
    tabsContainerRef,
  );

  const [gisReady, setGisReady] = useState(false);
  const gisHl = useMemo(() => gisScriptHl(locale), [locale]);

  useEffect(() => {
    setGisReady(false);
  }, [gisHl]);

  const registerPage = useRegisterPage();
  const googleAuth = useGoogleAuth({
    mode: tab === 'register' ? 'register' : 'login',
    userType: tab === 'register' ? registerPage.formData.type : undefined,
    gisScriptLoaded: gisReady,
  });
  const login = useLoginPage({
    suppressSignedInReturnNavigation: googleAuth.isGoogleAuthInFlight,
  });

  const handleTabClick = (next: AuthTab) => {
    if (next === tab) return;
    analytics.authTabSelect(next);
    const href = buildSignPageHref({ tab: next, returnUrl });
    router.replace(href, { scroll: false });
  };

  if (login.isInitialized && login.user && !googleAuth.isGoogleAuthInFlight) {
    return null;
  }

  if (googleAuth.isGoogleAuthInFlight) {
    return (
      <div className="max-w-md mx-auto mt-6 md:mt-12 mb-16" data-testid="auth-page">
        <div className="card p-6 md:p-8 text-center">
          <Spinner size="md" text={t('common.loading')} />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-6 md:mt-12 mb-16" data-testid="auth-page">
      {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? (
        <Script
          key={`gsi-client-${gisHl}`}
          src={`https://accounts.google.com/gsi/client?hl=${encodeURIComponent(gisHl)}`}
          strategy="afterInteractive"
          onLoad={() => setGisReady(true)}
        />
      ) : null}
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
            data-testid="auth-tab-login"
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
            data-testid="auth-tab-register"
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
          data-testid="auth-panel-login"
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
            handleLoginChange={login.handleLoginChange}
            handleLoginBlur={login.handleLoginBlur}
            handleSubmit={login.handleSubmit}
            showTitle={false}
            showRegisterLink={false}
            registerHref={buildSignPageHref({ tab: 'register', returnUrl })}
            formClassName="p-6 md:p-8"
          />
        </div>

        <div
          id="sign-panel-register"
          data-testid="auth-panel-register"
          role="tabpanel"
          aria-labelledby="sign-tab-register"
          hidden={tab !== 'register'}
          className={tab === 'register' ? 'block' : 'hidden'}
        >
          <RegisterPanel
            registerPage={registerPage}
            showTitle={false}
            showLoginLink={false}
            formClassName="p-6 md:p-8"
          />
        </div>
      </div>
      {gisReady ? (
        <div className="mt-6 space-y-4" data-testid="auth-google-outside-card">
          <div className="flex items-center gap-3">
            <span className="grow h-px bg-primary-700/25" />
            <span className="text-sm text-hint shrink-0">{t('sign.dividerOr')}</span>
            <span className="grow h-px bg-primary-700/25" />
          </div>
          <GoogleSignInButton
            containerRef={googleAuth.containerRef}
            clientIdConfigured={googleAuth.clientIdConfigured}
          />
        </div>
      ) : null}
    </div>
  );
}
