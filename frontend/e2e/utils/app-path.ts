export function pathnameWithoutLocalePrefix(pathname: string): string {
  return pathname.replace(/^\/[a-z]{2}\//i, '/');
}
