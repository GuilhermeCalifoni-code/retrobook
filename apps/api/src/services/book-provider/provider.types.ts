/**
 * Contrato do provedor de livros.
 *
 * O produto nunca fala com uma API de livros diretamente: fala com esta
 * interface. Trocar Google Books por OpenLibrary, por um acervo proprio ou por
 * uma base de editora e trocar a implementacao, sem tocar em controllers.
 */

export interface ExternalBook {
  /** id no provedor de origem */
  externalId: string;
  provider: string;
  title: string;
  subtitle?: string | null;
  description?: string | null;
  authors: string[];
  categories: string[];
  coverUrl?: string | null;
  pageCount?: number | null;
  publishedYear?: number | null;
  publisher?: string | null;
  language?: string | null;
  isbn13?: string | null;
  isbn10?: string | null;
}

export interface BookSearchOptions {
  query: string;
  limit?: number;
  language?: string;
}

export interface BookProvider {
  readonly name: string;
  search(options: BookSearchOptions): Promise<ExternalBook[]>;
  getByExternalId(externalId: string): Promise<ExternalBook | null>;
}
