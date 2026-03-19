import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import type { BoardInfo } from '@/lib/api';
import { getMetadataLocale, getServerTranslations } from '@/lib/i18n';

import BoardPageClient from './BoardPageClient';

const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function getBoardInfo(slug: string): Promise<BoardInfo | null> {
  try {
    const response = await fetch(`${apiUrl}/api/board/${encodeURIComponent(slug)}`, {
      next: { revalidate: 60 },
    });
    if (!response.ok) return null;
    return (await response.json()) as BoardInfo;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ nameSlug: string }>;
}): Promise<Metadata> {
  const { nameSlug } = await params;
  const board = await getBoardInfo(nameSlug);
  if (!board) {
    return { title: 'Not Found' };
  }
  const locale = await getMetadataLocale();
  const t = getServerTranslations(locale);
  const title = t.board.title.replace('{sellerName}', board.displayName);
  const description = t.board.metaDescription.replace('{sellerName}', board.displayName);
  return {
    title,
    description,
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
    },
  };
}

export default async function BoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ nameSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { nameSlug } = await params;
  const board = await getBoardInfo(nameSlug);
  if (!board) {
    redirect('/');
  }
  const resolvedSearchParams = await searchParams;
  return (
    <BoardPageClient
      nameSlug={nameSlug}
      board={board}
      initialSortBy={
        typeof resolvedSearchParams.sortBy === 'string' ? resolvedSearchParams.sortBy : undefined
      }
      initialSortOrder={
        typeof resolvedSearchParams.sortOrder === 'string' &&
        (resolvedSearchParams.sortOrder === 'ASC' || resolvedSearchParams.sortOrder === 'DESC')
          ? resolvedSearchParams.sortOrder
          : undefined
      }
    />
  );
}
