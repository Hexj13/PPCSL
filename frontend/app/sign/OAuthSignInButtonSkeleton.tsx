'use client';

import { authOAuthIconButtonSkeletonClass } from '@/app/sign/authOAuthButtonStyles';

type OAuthSignInButtonSkeletonProps = {
  testId?: string;
};

export function OAuthSignInButtonSkeleton({
  testId = 'auth-oauth-skeleton',
}: OAuthSignInButtonSkeletonProps) {
  return (
    <div className="w-full flex" data-testid={testId} aria-hidden>
      <div className={authOAuthIconButtonSkeletonClass} />
    </div>
  );
}
