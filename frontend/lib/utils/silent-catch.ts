import * as Sentry from '@sentry/nextjs';

export function silentCatch(context: string) {
  return (error: unknown) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[${context}]`, error);
    }
    Sentry.addBreadcrumb({
      category: 'silent-catch',
      message: context,
      level: 'warning',
      data: {
        error: error instanceof Error ? error.message : String(error),
      },
    });
  };
}
