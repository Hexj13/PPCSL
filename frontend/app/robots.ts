import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kupito.club';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/', '/login', '/register', '/verify-email', '/verify-phone'],
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: ['/api/', '/admin/', '/login', '/register', '/verify-email', '/verify-phone'],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
