import { env } from '../../config/env';
import { googleBooksProvider } from './google-books.provider';
import { localProvider } from './local.provider';
import type { BookProvider } from './provider.types';

const registry: Record<string, BookProvider> = {
  local: localProvider,
  google: googleBooksProvider,
};

/** Ponto unico de troca de provedor — configurado por env, nao por codigo. */
export function getBookProvider(): BookProvider {
  return registry[env.BOOK_PROVIDER] ?? localProvider;
}

export { localProvider, googleBooksProvider };
export type { BookProvider, ExternalBook } from './provider.types';
