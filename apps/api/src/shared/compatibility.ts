/**
 * Compatibilidade literaria (secao 54).
 *
 * Sistema de pontuacao explicito, sem ML: cada sinal em comum soma peso e o
 * total passa por uma saturacao exponencial, para que a 12a coincidencia valha
 * menos que a 2a. A saida e um numero de 0 a 100 e a lista de razoes que o
 * produto exibe ("voces tem 7 livros em comum") — a explicabilidade e parte da
 * experiencia, nao um detalhe.
 *
 * O formato de entrada e propositalmente agnostico de banco: quando evoluir
 * para recomendacao aprendida, basta trocar esta funcao mantendo o contrato.
 */

export const COMPATIBILITY_WEIGHTS = {
  book: 9,
  author: 6,
  community: 5,
  genre: 4,
  /** Avaliacoes proximas no mesmo livro indicam leitura parecida, nao so gosto. */
  ratingAgreement: 3,
} as const;

/** Constante de saturacao: ~63% do maximo quando o bruto atinge este valor. */
const SATURATION = 46;

export interface CompatibilityInput {
  bookIds: Set<string>;
  authorIds: Set<string>;
  genreIds: Set<string>;
  communityIds: Set<string>;
  /** bookId -> nota de 1 a 5 */
  ratings: Map<string, number>;
}

export interface CompatibilityReason {
  kind: 'books' | 'authors' | 'genres' | 'communities';
  count: number;
  label: string;
}

export interface CompatibilityResult {
  score: number;
  sharedBookIds: string[];
  sharedAuthorIds: string[];
  sharedGenreIds: string[];
  sharedCommunityIds: string[];
  reasons: CompatibilityReason[];
}

function intersect(a: Set<string>, b: Set<string>): string[] {
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  const out: string[] = [];
  for (const value of small) if (large.has(value)) out.push(value);
  return out;
}

function plural(count: number, one: string, many: string) {
  return count === 1 ? one : many;
}

export function computeCompatibility(a: CompatibilityInput, b: CompatibilityInput): CompatibilityResult {
  const sharedBookIds = intersect(a.bookIds, b.bookIds);
  const sharedAuthorIds = intersect(a.authorIds, b.authorIds);
  const sharedGenreIds = intersect(a.genreIds, b.genreIds);
  const sharedCommunityIds = intersect(a.communityIds, b.communityIds);

  let agreement = 0;
  for (const bookId of sharedBookIds) {
    const ra = a.ratings.get(bookId);
    const rb = b.ratings.get(bookId);
    if (ra != null && rb != null && Math.abs(ra - rb) <= 1) agreement += 1;
  }

  const raw =
    sharedBookIds.length * COMPATIBILITY_WEIGHTS.book +
    sharedAuthorIds.length * COMPATIBILITY_WEIGHTS.author +
    sharedGenreIds.length * COMPATIBILITY_WEIGHTS.genre +
    sharedCommunityIds.length * COMPATIBILITY_WEIGHTS.community +
    agreement * COMPATIBILITY_WEIGHTS.ratingAgreement;

  const score = raw === 0 ? 0 : Math.round(100 * (1 - Math.exp(-raw / SATURATION)));

  const reasons: CompatibilityReason[] = [];
  if (sharedBookIds.length)
    reasons.push({
      kind: 'books',
      count: sharedBookIds.length,
      label: `${sharedBookIds.length} ${plural(sharedBookIds.length, 'livro em comum', 'livros em comum')}`,
    });
  if (sharedAuthorIds.length)
    reasons.push({
      kind: 'authors',
      count: sharedAuthorIds.length,
      label: `${sharedAuthorIds.length} ${plural(sharedAuthorIds.length, 'autor em comum', 'autores em comum')}`,
    });
  if (sharedGenreIds.length)
    reasons.push({
      kind: 'genres',
      count: sharedGenreIds.length,
      label: `${sharedGenreIds.length} ${plural(sharedGenreIds.length, 'genero em comum', 'generos em comum')}`,
    });
  if (sharedCommunityIds.length)
    reasons.push({
      kind: 'communities',
      count: sharedCommunityIds.length,
      label: `${sharedCommunityIds.length} ${plural(sharedCommunityIds.length, 'comunidade em comum', 'comunidades em comum')}`,
    });

  return { score, sharedBookIds, sharedAuthorIds, sharedGenreIds, sharedCommunityIds, reasons };
}

export function emptyProfile(): CompatibilityInput {
  return {
    bookIds: new Set(),
    authorIds: new Set(),
    genreIds: new Set(),
    communityIds: new Set(),
    ratings: new Map(),
  };
}
