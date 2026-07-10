'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import Script from 'next/script';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

import { LoginForm } from '@/app/login/LoginForm';
import { useLoginPage } from '@/app/login/useLoginPage';
import { RegisterPanel } from '@/app/register/RegisterPanel';
import { useRegisterPage } from '@/app/register/useRegisterPage';
import { AuthOAuthOutsideCard } from '@/app/sign/AuthOAuthOutsideCard';
import { isTelegramDevMockEnabled } from '@/app/sign/telegramDevMock';
import { useGoogleAuth } from '@/app/sign/useGoogleAuth';
import { useTelegramAuth } from '@/app/sign/useTelegramAuth';
import { useI18n } from '@/components/providers/I18nProvider';
import { useTabIndicator } from '@/hooks/useTabIndicator';
import { useTranslation } from '@/hooks/useTranslation';
import { analytics } from '@/lib/analytics';
import { buildSignPageHref, getReturnUrlFromSearchParams } from '@/lib/return-url';

export type AuthTab = 'login' | 'register';

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
  const [telegramScriptReady, setTelegramScriptReady] = useState(false);
  const googleClientIdConfigured = Boolean(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID);
  const telegramClientIdConfigured =
    Boolean(process.env.NEXT_PUBLIC_TELEGRAM_CLIENT_ID?.trim()) || isTelegramDevMockEnabled();

  useEffect(() => {
    if (typeof window !== 'undefined' && window.google?.accounts?.id) {
      setGisReady(true);
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram?.Login?.auth) {
      setTelegramScriptReady(true);
    }
  }, []);

  const registerPage = useRegisterPage();
  const googleAuth = useGoogleAuth({
    tab,
    preferredNewUserType: tab === 'register' ? registerPage.formData.type : undefined,
    gisScriptLoaded: gisReady,
  });
  const telegramAuth = useTelegramAuth({
    tab,
    preferredNewUserType: tab === 'register' ? registerPage.formData.type : undefined,
    telegramScriptLoaded: telegramScriptReady,
    locale,
  });
  const login = useLoginPage({
    suppressSignedInReturnNavigation:
      googleAuth.isGoogleBusy || telegramAuth.isTelegramBusy || registerPage.loading,
  });

  const isAlreadySignedInRedirecting =
    login.isInitialized && !!login.user && !googleAuth.isGoogleBusy && !telegramAuth.isTelegramBusy;
  const authSubmitBusy =
    login.loading ||
    isAlreadySignedInRedirecting ||
    googleAuth.isGoogleBusy ||
    telegramAuth.isTelegramBusy;
  const loginSubmitBusy = login.loading || isAlreadySignedInRedirecting;
  const googleDisabled = authSubmitBusy;
  const registerAuthBusy = googleAuth.isGoogleBusy || telegramAuth.isTelegramBusy;

  const handleTabClick = (next: AuthTab) => {
    if (next === tab) return;
    if (authSubmitBusy) return;
    analytics.authTabSelect(next);
    const href = buildSignPageHref({ tab: next, returnUrl });
    router.replace(href, { scroll: false });
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, current: AuthTab) => {
    if (authSubmitBusy) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const next: AuthTab =
      event.key === 'ArrowRight'
        ? current === 'login'
          ? 'register'
          : 'login'
        : current === 'login'
          ? 'register'
          : 'login';
    handleTabClick(next);
    const nextRef = next === 'login' ? loginTabRef : registerTabRef;
    nextRef.current?.focus();
  };

  return (
    <div className="max-w-md mx-auto mt-6 md:mt-12 mb-16" data-testid="auth-page">
      {telegramClientIdConfigured && !isTelegramDevMockEnabled() ? (
        <Script
          src="https://oauth.telegram.org/js/telegram-login.js?5"
          strategy="afterInteractive"
          onReady={() => setTelegramScriptReady(true)}
        />
      ) : null}
      {googleClientIdConfigured ? (
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
          onReady={() => setGisReady(true)}
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
            aria-controls="sign-panel-login"
            id="sign-tab-login"
            tabIndex={tab === 'login' ? 0 : -1}
            data-testid="auth-tab-login"
            className={`flex-1 px-4 py-3 text-sm md:text-base font-semibold transition-all duration-300 ease-in-out relative z-10 text-primary-900 ${
              tab === 'login'
                ? 'bg-primary-500/10 rounded-tl-lg'
                : 'hover-only:hover:bg-primary-500/10'
            }`}
            onClick={() => handleTabClick('login')}
            onKeyDown={(event) => handleTabKeyDown(event, 'login')}
            disabled={authSubmitBusy}
          >
            {t('login.title')}
          </button>
          <button
            ref={registerTabRef}
            type="button"
            role="tab"
            aria-selected={tab === 'register'}
            aria-controls="sign-panel-register"
            id="sign-tab-register"
            tabIndex={tab === 'register' ? 0 : -1}
            data-testid="auth-tab-register"
            className={`flex-1 px-4 py-3 text-sm md:text-base font-semibold transition-all duration-300 ease-in-out relative z-10 text-primary-900 ${
              tab === 'register'
                ? 'bg-primary-500/10 rounded-tr-lg'
                : 'hover-only:hover:bg-primary-500/10'
            }`}
            onClick={() => handleTabClick('register')}
            onKeyDown={(event) => handleTabKeyDown(event, 'register')}
            disabled={authSubmitBusy}
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
            loading={loginSubmitBusy}
            disabled={authSubmitBusy}
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
            authBusy={registerAuthBusy}
            disabled={authSubmitBusy}
          />
        </div>
      </div>
      <AuthOAuthOutsideCard
        googleClientIdConfigured={googleClientIdConfigured}
        telegramClientIdConfigured={telegramClientIdConfigured}
        gisReady={gisReady}
        googleAuth={googleAuth}
        telegramAuth={telegramAuth}
        googleDisabled={googleDisabled}
        authSubmitBusy={authSubmitBusy}
      />
    </div>
  );
}
