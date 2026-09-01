import { prisma } from '../../database/prisma';
import type { BookProvider, BookSearchOptions, ExternalBook } from './provider.types';

/**
 * Provedor padrao do ambiente de desenvolvimento: o proprio acervo do RetroBook,
 * populado pelo seed. Mantem o app 100% funcional offline e sem chave de API.
 */
export const localProvider: BookProvider = {
  name: 'local',

  async search({ query, limit = 12 }: BookSearchOptions): Promise<ExternalBook[]> {
    const books = await prisma.book.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { subtitle: { contains: query, mode: 'insensitive' } },
          { authors: { some: { author: { name: { contains: query, mode: 'insensitive' } } } } },
        ],
      },
      include: { authors: { include: { author: true } }, genres: { include: { genre: true } } },
      orderBy: { readersCount: 'desc' },
      take: limit,
    });

    return books.map(toExternal);
  },

  async getByExternalId(externalId: string) {
    const book = await prisma.book.findFirst({
      where: { OR: [{ id: externalId }, { externalId }, { slug: externalId }] },
      include: { authors: { include: { author: true } }, genres: { include: { genre: true } } },
    });
    return book ? toExternal(book) : null;
  },
};

type BookWithRelations = Awaited<ReturnType<typeof prisma.book.findFirstOrThrow>> & {
  authors: { author: { name: string } }[];
  genres: { genre: { name: string } }[];
};

function toExternal(book: BookWithRelations): ExternalBook {
  return {
    externalId: book.externalId ?? book.id,
    provider: 'local',
    title: book.title,
    subtitle: book.subtitle,
    description: book.description,
    authors: book.authors.map((a) => a.author.name),
    categories: book.genres.map((g) => g.genre.name),
    coverUrl: book.coverUrl,
    pageCount: book.pageCount,
    publishedYear: book.publishedYear,
    publisher: book.publisher,
    language: book.language,
    isbn13: book.isbn13,
    isbn10: book.isbn10,
  };
}
