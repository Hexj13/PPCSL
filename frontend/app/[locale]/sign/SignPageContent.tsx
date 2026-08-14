'use client';

import { useRouter } from 'next/navigation';
import Script from 'next/script';
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

import { LoginForm } from '@/app/[locale]/login/LoginForm';
import { useLoginPage } from '@/app/[locale]/login/useLoginPage';
import { RegisterPanel } from '@/app/[locale]/register/RegisterPanel';
import { useRegisterPage } from '@/app/[locale]/register/useRegisterPage';
import { AuthOAuthOutsideCard } from '@/app/[locale]/sign/AuthOAuthOutsideCard';
import { isTelegramDevMockEnabled } from '@/app/[locale]/sign/telegramDevMock';
import { useSignPageSocialAuth } from '@/app/[locale]/sign/useSignPageSocialAuth';
import { useI18n } from '@/components/providers/I18nProvider';
import { useTabIndicator } from '@/hooks/useTabIndicator';
import { useTranslation } from '@/hooks/useTranslation';
import { analytics } from '@/lib/analytics';
import { buildSignPageHref } from '@/lib/return-url';

export type AuthTab = 'login' | 'register';

type SignPageContentProps = {
  tab?: AuthTab;
  returnUrl?: string | null;
};

export function SignPageContent({
  tab: initialTab = 'login',
  returnUrl = null,
}: SignPageContentProps) {
  const { t } = useTranslation();
  const { locale } = useI18n();
  const router = useRouter();
  const [tab, setTab] = useState<AuthTab>(initialTab);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const loginTabRef = useRef<HTMLButtonElement>(null);
  const registerTabRef = useRef<HTMLButtonElement>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  const { indicatorRef, indicatorStyle } = useTabIndicator(
    tab,
    { login: loginTabRef, register: registerTabRef },
    tabsContainerRef,
  );

  const registerPage = useRegisterPage({ returnUrl });
  const {
    googleClientIdConfigured,
    telegramClientIdConfigured,
    facebookClientIdConfigured,
    googleAuth,
    telegramAuth,
    facebookAuth,
    socialBusy,
    setGisReady,
    setTelegramScriptReady,
    setFacebookScriptReady,
  } = useSignPageSocialAuth({
    tab,
    preferredNewUserType: tab === 'register' ? registerPage.formData.type : undefined,
    locale,
    returnUrl,
  });

  const login = useLoginPage({
    suppressSignedInReturnNavigation: socialBusy || registerPage.loading,
    returnUrl,
  });

  const isAlreadySignedInRedirecting = login.isInitialized && !!login.user && !socialBusy;
  const authSubmitBusy = login.loading || isAlreadySignedInRedirecting || socialBusy;
  const loginSubmitBusy = login.loading || isAlreadySignedInRedirecting;
  const googleDisabled = authSubmitBusy;
  const registerAuthBusy = socialBusy;

  const handleTabClick = (next: AuthTab) => {
    if (next === tab) return;
    if (authSubmitBusy) return;
    analytics.authTabSelect(next);
    setTab(next);
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
      {facebookClientIdConfigured ? (
        <Script
          src="https://connect.facebook.net/en_US/sdk.js"
          strategy="afterInteractive"
          onReady={() => setFacebookScriptReady(true)}
          onError={() => setFacebookScriptReady(true)}
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
        facebookClientIdConfigured={facebookClientIdConfigured}
        googleAuth={googleAuth}
        telegramAuth={telegramAuth}
        facebookAuth={facebookAuth}
        googleDisabled={googleDisabled}
        authSubmitBusy={authSubmitBusy}
      />
    </div>
  );
}
