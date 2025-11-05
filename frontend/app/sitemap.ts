import { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://kupito.mk';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrls: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${siteUrl}/listings`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${siteUrl}/my-listings`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.5,
    },
  ];

  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const response = await fetch(`${apiUrl}/api/listings?limit=10000&status=Active`, {
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return baseUrls;
    }

    const data = await response.json();
    const listings = data.data || [];

    const listingUrls: MetadataRoute.Sitemap = listings.map((listing: any) => ({
      url: `${siteUrl}/listings/${listing.id}`,
      lastModified: new Date(listing.updated_at || listing.created_at),
      changeFrequency: 'weekly',
      priority: 0.8,
    }));

    return [...baseUrls, ...listingUrls];
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return baseUrls;
  }
}
