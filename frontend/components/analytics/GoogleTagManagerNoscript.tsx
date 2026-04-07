const GTM_ID = 'GTM-K527X5WK';

type GoogleTagManagerNoscriptProps = {
  title: string;
};

function isProductionHostname(hostname: string) {
  return (
    hostname !== 'localhost' &&
    hostname !== '127.0.0.1' &&
    !hostname.startsWith('192.168.') &&
    !hostname.startsWith('10.') &&
    hostname !== '0.0.0.0'
  );
}

function getProductionHostname() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) return null;
  try {
    const url = new URL(siteUrl);
    return url.hostname;
  } catch {
    return null;
  }
}

export function GoogleTagManagerNoscript({ title }: GoogleTagManagerNoscriptProps) {
  const productionHostname = getProductionHostname();
  const shouldLoad = productionHostname
    ? isProductionHostname(productionHostname)
    : process.env.NODE_ENV === 'production';

  if (!shouldLoad) return null;

  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
        title={title}
        height="0"
        width="0"
        style={{ display: 'none', visibility: 'hidden' }}
      />
    </noscript>
  );
}
