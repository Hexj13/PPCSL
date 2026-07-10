'use client';

import { authOAuthIconButtonSkeletonClass } from '@/app/sign/authOAuthButtonStyles';

type OAuthSignInButtonSkeletonProps = {
  testId?: string;
};

export function OAuthSignInButtonSkeleton({
  testId = 'auth-oauth-skeleton',
}: OAuthSignInButtonSkeletonProps) {
  return (
    <div className="flex h-10 w-10 shrink-0" data-testid={testId} aria-hidden>
      <div className={authOAuthIconButtonSkeletonClass} />
    </div>
  );
}
