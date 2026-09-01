/**
 * Contrato do motor de recomendacao (secao 21).
 *
 * Regra que vale para todo o produto: **nenhuma recomendacao sai sem razao**.
 * O `reason` nao e enfeite de interface — e o contrato. Se o motor nao souber
 * explicar por que sugeriu algo, a sugestao nao deveria existir.
 *
 * A forma abaixo e propositalmente agnostica de como o score foi calculado.
 * Hoje e deterministico; quando virar modelo aprendido, muda a implementacao e
 * o contrato continua o mesmo.
 */

export type ReasonKind =
  | 'shared_books' // voces leem os mesmos livros
  | 'shared_authors'
  | 'shared_genres'
  | 'shared_communities'
  | 'peer_recommended' // leitores parecidos aprovaram
  | 'genre_match' // combina com os interesses declarados
  | 'author_match'
  | 'community_activity' // esta acontecendo algo la
  | 'reading_now' // gente lendo isso agora
  | 'serendipity' // conexao indireta: descoberta fora do obvio
  | 'popular'; // ultimo recurso, sempre rotulado como tal

export interface RecommendationReason {
  kind: ReasonKind;
  /** Texto pronto para a interface, ja no tom do produto. */
  label: string;
  /** Peso que esta razao teve no score — util para depurar e para o futuro admin. */
  weight: number;
  count?: number;
}

export interface Recommendation<T> {
  item: T;
  score: number;
  reasons: RecommendationReason[];
}

/** Pesos declarados em um lugar so: mexer aqui muda o comportamento do produto. */
export const WEIGHTS = {
  sharedBook: 9,
  sharedAuthor: 6,
  sharedCommunity: 5,
  sharedGenre: 4,
  peerRating: 7,
  genreMatch: 5,
  authorMatch: 6,
  communityActivity: 3,
  readingNow: 2,
  serendipity: 4,
  popular: 1,
} as const;

/**
 * Saturacao exponencial: a 12a coincidencia vale menos que a 2a.
 * Sem isso, quem tem estante grande domina todas as listas.
 */
export function saturate(raw: number, constant = 26): number {
  if (raw <= 0) return 0;
  return Math.round(100 * (1 - Math.exp(-raw / constant)));
}

export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** Ordena por score e corta, mantendo apenas o que tem alguma razao. */
export function rank<T>(items: Recommendation<T>[], limit: number): Recommendation<T>[] {
  return items
    .filter((entry) => entry.reasons.length > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
