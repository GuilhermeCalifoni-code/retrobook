/** Utilitarios de texto: slug, sanitizacao e politica de citacao. */

/**
 * NFD separa a letra do acento; remover o que nao e ASCII descarta as marcas
 * combinantes e preserva a letra base ("Ficcao Cientifica" -> "ficcao-cientifica").
 */
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[^\x00-\x7F]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

export async function uniqueSlug(base: string, exists: (slug: string) => Promise<boolean>) {
  const root = slugify(base) || 'item';
  let candidate = root;
  let n = 1;
  while (await exists(candidate)) {
    n += 1;
    candidate = `${root}-${n}`;
  }
  return candidate;
}

/**
 * Nada de HTML vindo do usuario. O conteudo e armazenado como texto puro e o
 * frontend renderiza como texto — dupla barreira contra XSS.
 */
export function stripHtml(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

/**
 * Politica de citacao (secao 14): trechos sao permitidos como citacao curta.
 * Limitamos tamanho e exigimos referencia ao livro na camada de servico.
 */
export const QUOTE_MAX_CHARS = 400;

export function assertQuoteWithinPolicy(quote: string) {
  const clean = stripHtml(quote);
  if (clean.length === 0) return { ok: false as const, reason: 'A citacao esta vazia.' };
  if (clean.length > QUOTE_MAX_CHARS) {
    return {
      ok: false as const,
      reason: `Citacoes sao limitadas a ${QUOTE_MAX_CHARS} caracteres para respeitar direitos autorais.`,
    };
  }
  return { ok: true as const, value: clean };
}

export function extractTags(input: string[] | undefined): string[] {
  if (!input) return [];
  return Array.from(
    new Set(
      input
        .map((t) => slugify(t))
        .filter(Boolean)
        .slice(0, 8),
    ),
  );
}

export function excerpt(value: string, max = 180) {
  const clean = value.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}...` : clean;
}
