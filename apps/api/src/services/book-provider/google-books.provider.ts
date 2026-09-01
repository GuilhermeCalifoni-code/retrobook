import { env } from '../../config/env';
import type { BookProvider, BookSearchOptions, ExternalBook } from './provider.types';

const BASE_URL = 'https://www.googleapis.com/books/v1/volumes';

interface GoogleVolume {
  id: string;
  volumeInfo?: {
    title?: string;
    subtitle?: string;
    description?: string;
    authors?: string[];
    categories?: string[];
    pageCount?: number;
    publishedDate?: string;
    publisher?: string;
    language?: string;
    imageLinks?: { thumbnail?: string; smallThumbnail?: string };
    industryIdentifiers?: { type: string; identifier: string }[];
  };
}

function mapVolume(volume: GoogleVolume): ExternalBook {
  const info = volume.volumeInfo ?? {};
  const ids = info.industryIdentifiers ?? [];
  return {
    externalId: volume.id,
    provider: 'google',
    title: info.title ?? 'Sem titulo',
    subtitle: info.subtitle ?? null,
    description: info.description ?? null,
    authors: info.authors ?? [],
    categories: info.categories ?? [],
    // https evita mixed content; zoom=2 traz uma capa mais nitida.
    coverUrl:
      info.imageLinks?.thumbnail?.replace('http://', 'https://').replace('zoom=1', 'zoom=2') ??
      info.imageLinks?.smallThumbnail?.replace('http://', 'https://') ??
      null,
    pageCount: info.pageCount ?? null,
    publishedYear: info.publishedDate ? Number(info.publishedDate.slice(0, 4)) || null : null,
    publisher: info.publisher ?? null,
    language: info.language ?? null,
    isbn13: ids.find((i) => i.type === 'ISBN_13')?.identifier ?? null,
    isbn10: ids.find((i) => i.type === 'ISBN_10')?.identifier ?? null,
  };
}

export const googleBooksProvider: BookProvider = {
  name: 'google',

  async search({ query, limit = 12, language = 'pt' }: BookSearchOptions) {
    const url = new URL(BASE_URL);
    url.searchParams.set('q', query);
    url.searchParams.set('maxResults', String(Math.min(limit, 40)));
    url.searchParams.set('langRestrict', language);
    if (env.GOOGLE_BOOKS_API_KEY) url.searchParams.set('key', env.GOOGLE_BOOKS_API_KEY);

    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];
    const data = (await res.json()) as { items?: GoogleVolume[] };
    return (data.items ?? []).map(mapVolume);
  },

  async getByExternalId(externalId: string) {
    const url = new URL(`${BASE_URL}/${encodeURIComponent(externalId)}`);
    if (env.GOOGLE_BOOKS_API_KEY) url.searchParams.set('key', env.GOOGLE_BOOKS_API_KEY);
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    return mapVolume((await res.json()) as GoogleVolume);
  },
};
