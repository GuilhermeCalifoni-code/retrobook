import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import type { Book, BookDetail, LibraryEntry, NamedRef, Page, ReadingStatus } from '@/types/api';

export function useBooks(filters: { genre?: string; sort?: string } = {}) {
  return useQuery({
    queryKey: queryKeys.books(filters),
    queryFn: () => api.get<Page<Book>>('/books', filters),
  });
}

export function useBook(slug: string) {
  return useQuery({
    queryKey: queryKeys.book(slug),
    queryFn: () => api.get<BookDetail>(`/books/${slug}`),
    enabled: Boolean(slug),
  });
}

export function useGenres() {
  return useQuery({
    queryKey: queryKeys.genres,
    queryFn: () => api.get<{ items: (NamedRef & { description: string | null; booksCount: number })[] }>('/books/genres'),
    staleTime: 30 * 60_000,
  });
}

/** Busca de livros com termo ja debounced pelo chamador. */
export function useBookSearch(query: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.bookSearch(query),
    queryFn: () => api.get<{ items: Book[] }>('/books/search', { q: query }),
    enabled: enabled && query.trim().length >= 2,
    staleTime: 60_000,
  });
}

export function useLibrary(status?: ReadingStatus) {
  return useQuery({
    queryKey: queryKeys.library(status),
    queryFn: () =>
      api.get<{ items: LibraryEntry[]; counts: Record<ReadingStatus, number> }>('/library', { status }),
  });
}

/** Invalida tudo que depende do estado da biblioteca (home, livro, estatisticas). */
function useLibraryInvalidation() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: ['library'] });
    void queryClient.invalidateQueries({ queryKey: ['book'] });
    void queryClient.invalidateQueries({ queryKey: queryKeys.home });
    void queryClient.invalidateQueries({ queryKey: queryKeys.stats });
    void queryClient.invalidateQueries({ queryKey: queryKeys.session });
  };
}

export function useAddToLibrary() {
  const invalidate = useLibraryInvalidation();
  return useMutation({
    mutationFn: (input: { bookId: string; status?: ReadingStatus; rating?: number; isFavorite?: boolean }) =>
      api.post<LibraryEntry>('/library/books', input),
    onSuccess: invalidate,
  });
}

export function useUpdateLibraryEntry() {
  const invalidate = useLibraryInvalidation();
  return useMutation({
    mutationFn: ({
      bookId,
      ...input
    }: {
      bookId: string;
      status?: ReadingStatus;
      rating?: number | null;
      isFavorite?: boolean;
      currentPage?: number;
      progress?: number;
    }) => api.patch<LibraryEntry>(`/library/books/${bookId}`, input),
    onSuccess: invalidate,
  });
}

export function useRemoveFromLibrary() {
  const invalidate = useLibraryInvalidation();
  return useMutation({
    mutationFn: (bookId: string) => api.delete(`/library/books/${bookId}`),
    onSuccess: invalidate,
  });
}

export function useUpsertReview() {
  const invalidate = useLibraryInvalidation();
  return useMutation({
    mutationFn: ({
      bookId,
      ...input
    }: {
      bookId: string;
      rating: number;
      title?: string;
      content: string;
      containsSpoiler?: boolean;
    }) => api.put(`/library/books/${bookId}/review`, input),
    onSuccess: invalidate,
  });
}
