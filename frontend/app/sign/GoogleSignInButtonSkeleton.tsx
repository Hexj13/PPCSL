'use client';

export function GoogleSignInButtonSkeleton() {
  return (
    <div
      className="w-full flex flex-col items-center gap-2"
      data-testid="auth-google-skeleton"
      aria-hidden
    >
      <div className="h-10 w-full max-w-[320px] min-h-[40px] bg-bg-secondary/40 rounded-sm animate-pulse" />
      <div className="h-8 w-full max-w-[280px] bg-bg-secondary/30 rounded-sm animate-pulse" />
    </div>
  );
}
