import { ReadingStatus, SpoilerScopeType, SpoilerPreference } from '@prisma/client';
import { prisma } from '../../database/prisma';

/**
 * Spoilers inteligentes (secao 14) — o diferencial do RetroBook.
 *
 * Em vez de esconder todo spoiler de todo mundo, comparamos o **alcance
 * declarado** do spoiler com o **progresso real** de quem esta lendo:
 *
 *   "Spoiler ate o capitulo 12" + voce esta no capitulo 20  -> aparece normal
 *   "Spoiler ate o capitulo 12" + voce esta no capitulo 3   -> fica escondido
 *
 * A decisao vive no backend de proposito: o app nativo futuro recebe a mesma
 * resposta pronta, sem precisar baixar a biblioteca inteira do usuario para
 * decidir na tela (secao 49).
 */

export interface SpoilerScope {
  type: SpoilerScopeType;
  value?: number | null;
}

export interface ViewerSpoilerState {
  /** Se true, a interface cobre o conteudo ate a pessoa escolher revelar. */
  hidden: boolean;
  /** Rotulo curto: "Ate o capitulo 12", "Final do livro". */
  label: string | null;
  /** Por que foi liberado ou escondido — aparece como microcopy. */
  explanation: string | null;
}

export interface ReaderProgress {
  status: ReadingStatus;
  currentPage: number;
  currentChapter: number | null;
}

/** Texto exibido no selo do spoiler, derivado do alcance estruturado. */
export function describeScope(scope: SpoilerScope | null): string | null {
  if (!scope) return null;
  switch (scope.type) {
    case SpoilerScopeType.CHAPTER:
      return scope.value ? `Ate o capitulo ${scope.value}` : 'Sobre um capitulo especifico';
    case SpoilerScopeType.PAGE:
      return scope.value ? `Ate a pagina ${scope.value}` : 'Sobre um trecho especifico';
    case SpoilerScopeType.PART:
      return scope.value ? `Ate a parte ${scope.value}` : 'Sobre uma parte do livro';
    case SpoilerScopeType.ENDING:
      return 'Final do livro';
    case SpoilerScopeType.GENERAL:
    default:
      return 'Spoiler geral';
  }
}

/**
 * Decide se o veu de spoiler aparece para este leitor.
 *
 * `progress` nulo significa que o livro nao esta na estante da pessoa — nesse
 * caso escondemos, porque nao ha como saber onde ela esta.
 */
export function resolveSpoiler(
  post: { containsSpoiler: boolean; spoilerScopeType: SpoilerScopeType | null; spoilerScopeValue: number | null },
  preference: SpoilerPreference,
  progress: ReaderProgress | null,
): ViewerSpoilerState {
  if (!post.containsSpoiler) return { hidden: false, label: null, explanation: null };

  const scope: SpoilerScope | null = post.spoilerScopeType
    ? { type: post.spoilerScopeType, value: post.spoilerScopeValue }
    : null;
  const label = describeScope(scope);

  if (preference === SpoilerPreference.ALWAYS_SHOW) {
    return { hidden: false, label, explanation: null };
  }
  if (preference === SpoilerPreference.ALWAYS_HIDE) {
    return { hidden: true, label, explanation: 'Voce escolheu esconder todos os spoilers.' };
  }

  // HIDE_UNREAD: a decisao depende de onde a pessoa esta na leitura.
  if (!progress) {
    return { hidden: true, label, explanation: 'Este livro ainda nao esta na sua estante.' };
  }
  if (progress.status === ReadingStatus.READ) {
    return { hidden: false, label, explanation: 'Voce ja terminou este livro.' };
  }

  const type = scope?.type ?? SpoilerScopeType.GENERAL;
  const value = scope?.value ?? null;

  if (type === SpoilerScopeType.ENDING || type === SpoilerScopeType.GENERAL || value == null) {
    return { hidden: true, label, explanation: 'Aparece quando voce terminar o livro.' };
  }

  if (type === SpoilerScopeType.CHAPTER) {
    if (progress.currentChapter == null) {
      return { hidden: true, label, explanation: 'Registre em que capitulo voce esta para liberar automaticamente.' };
    }
    return progress.currentChapter >= value
      ? { hidden: false, label, explanation: `Voce ja passou do capitulo ${value}.` }
      : { hidden: true, label, explanation: `Aparece quando voce chegar ao capitulo ${value}.` };
  }

  if (type === SpoilerScopeType.PAGE) {
    return progress.currentPage >= value
      ? { hidden: false, label, explanation: `Voce ja passou da pagina ${value}.` }
      : { hidden: true, label, explanation: `Aparece quando voce chegar a pagina ${value}.` };
  }

  // PART nao tem granularidade confiavel na biblioteca: tratamos como geral.
  return { hidden: true, label, explanation: 'Aparece quando voce terminar o livro.' };
}

/**
 * Carrega o progresso do leitor nos livros citados por uma lista de posts,
 * em uma consulta so. Sem isso, um feed de 20 posts viraria 20 consultas.
 */
export async function loadReaderProgress(
  userId: string | undefined,
  bookIds: (string | null | undefined)[],
): Promise<Map<string, ReaderProgress>> {
  const map = new Map<string, ReaderProgress>();
  const ids = Array.from(new Set(bookIds.filter((id): id is string => Boolean(id))));
  if (!userId || ids.length === 0) return map;

  const entries = await prisma.userBook.findMany({
    where: { userId, bookId: { in: ids } },
    select: { bookId: true, status: true, currentPage: true, currentChapter: true },
  });

  for (const entry of entries) {
    map.set(entry.bookId, {
      status: entry.status,
      currentPage: entry.currentPage,
      currentChapter: entry.currentChapter,
    });
  }
  return map;
}

/** Converte a entrada do compositor de post no alcance estruturado. */
export function buildScope(input: {
  spoilerScopeType?: SpoilerScopeType;
  spoilerScopeValue?: number;
}): { spoilerScopeType: SpoilerScopeType | null; spoilerScopeValue: number | null; spoilerScope: string | null } {
  if (!input.spoilerScopeType) {
    return { spoilerScopeType: null, spoilerScopeValue: null, spoilerScope: null };
  }
  const scope = { type: input.spoilerScopeType, value: input.spoilerScopeValue ?? null };
  return {
    spoilerScopeType: input.spoilerScopeType,
    spoilerScopeValue: input.spoilerScopeValue ?? null,
    spoilerScope: describeScope(scope),
  };
}
