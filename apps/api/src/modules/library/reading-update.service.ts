import { PostType, ReadingStatus } from '@prisma/client';
import { ApiError } from '../../common/api-error';
import { stripHtml } from '../../common/text';
import { prisma } from '../../database/prisma';
import { postCardSelect, serializePost } from '../../shared/selectors';
import { createNotificationsBulk } from '../notifications/notifications.service';
import { PRODUCT_EVENTS, track } from '../analytics/events.service';

/**
 * Atualizacao de leitura como evento social (secao 12).
 *
 * A regra que mais importa aqui e a que **impede** o recurso de existir:
 * progresso nao vira post automaticamente. So vira quando a pessoa escolhe
 * compartilhar, e ainda assim com uma janela anti-flood — senao o feed do
 * RetroBook viraria um mural de "cheguei na pagina 12, cheguei na pagina 14".
 */

/** Janela minima entre duas atualizacoes do mesmo livro. */
const COOLDOWN_HOURS = 6;

export interface ShareReadingUpdateInput {
  bookId: string;
  /** Comentario opcional: "a virada do capitulo 8 me pegou". */
  note?: string;
  /** Marca o post como conclusao de leitura. */
  finished?: boolean;
  communitySlug?: string;
}

export async function shareReadingUpdate(userId: string, input: ShareReadingUpdateInput) {
  const entry = await prisma.userBook.findUnique({
    where: { userId_bookId: { userId, bookId: input.bookId } },
    include: { book: { select: { id: true, title: true, pageCount: true } } },
  });
  if (!entry) throw ApiError.badRequest('Adicione o livro a sua biblioteca antes de compartilhar o progresso.');

  const since = new Date(Date.now() - COOLDOWN_HOURS * 60 * 60 * 1000);
  const recent = await prisma.post.findFirst({
    where: {
      authorId: userId,
      bookId: input.bookId,
      type: PostType.READING_UPDATE,
      createdAt: { gte: since },
      // Se voce apagou a atualizacao anterior, pode publicar de novo.
      isRemoved: false,
    },
    select: { id: true },
  });
  if (recent && !input.finished) {
    throw ApiError.conflict(
      `Voce ja compartilhou o progresso deste livro nas ultimas ${COOLDOWN_HOURS} horas.`,
      'reading_update_cooldown',
    );
  }

  let communityId: string | undefined;
  if (input.communitySlug) {
    const community = await prisma.community.findUnique({
      where: { slug: input.communitySlug },
      select: { id: true },
    });
    if (community) communityId = community.id;
  }

  const finished = input.finished || entry.status === ReadingStatus.READ;
  const content = input.note?.trim()
    ? stripHtml(input.note)
    : finished
      ? `Terminei ${entry.book.title}.`
      : entry.book.pageCount
        ? `Cheguei a pagina ${entry.currentPage} de ${entry.book.pageCount}.`
        : `Estou em ${entry.progress}% de ${entry.book.title}.`;

  const post = await prisma.post.create({
    data: {
      authorId: userId,
      communityId,
      bookId: entry.book.id,
      type: PostType.READING_UPDATE,
      content,
      progressPage: entry.currentPage,
      progressPercent: finished ? 100 : entry.progress,
      progressChapter: entry.currentChapter,
    },
    select: postCardSelect,
  });

  if (communityId) {
    await prisma.community.update({ where: { id: communityId }, data: { postsCount: { increment: 1 } } });
  }

  // Quem le o mesmo livro tem interesse real nisso — e so quem terminou junto.
  if (finished) {
    const companions = await prisma.userBook.findMany({
      where: { bookId: entry.book.id, status: ReadingStatus.READING, userId: { not: userId } },
      select: { userId: true },
      take: 50,
    });
    const profile = await prisma.profile.findUnique({ where: { userId }, select: { name: true } });
    await createNotificationsBulk(
      companions.map((c) => c.userId),
      {
        actorId: userId,
        type: 'BOOK_MATCH',
        title: `${profile?.name ?? 'Alguem'} terminou ${entry.book.title}`,
        body: 'Voces estavam lendo juntos. Vale puxar conversa.',
        href: `/post/${post.id}`,
        entityType: 'post',
        entityId: post.id,
      },
    );
  }

  track({
    name: PRODUCT_EVENTS.POST_CREATED,
    userId,
    entityType: 'post',
    entityId: post.id,
    metadata: { type: 'READING_UPDATE', finished },
  });

  return serializePost(post, { canModerate: true, spoiler: { hidden: false, label: null, explanation: null } });
}

/**
 * O que oferecer quando alguem termina um livro (secao 28).
 *
 * A conclusao e o momento de maior energia da leitura: em vez de sumir com um
 * toast, devolvemos os proximos passos que fazem sentido naquele instante.
 */
export async function getFinishCelebration(userId: string, bookId: string) {
  const [entry, review, companions, communities, nextBooks] = await Promise.all([
    prisma.userBook.findUnique({
      where: { userId_bookId: { userId, bookId } },
      include: { book: { select: { id: true, slug: true, title: true, coverUrl: true, pageCount: true } } },
    }),
    prisma.review.findUnique({ where: { userId_bookId: { userId, bookId } }, select: { id: true } }),
    prisma.userBook.count({
      where: { bookId, status: ReadingStatus.READ, userId: { not: userId } },
    }),
    prisma.community.findMany({
      where: { books: { some: { bookId } }, privacy: 'PUBLIC' },
      select: { id: true, slug: true, name: true, accentColor: true, membersCount: true },
      orderBy: { membersCount: 'desc' },
      take: 3,
    }),
    // Precisamos dos generos do livro terminado antes de procurar vizinhos.
    prisma.bookGenre.findMany({ where: { bookId }, select: { genreId: true } }).then((rows) =>
      rows.length
        ? prisma.book.findMany({
            where: {
              id: { not: bookId },
              genres: { some: { genreId: { in: rows.map((r) => r.genreId) } } },
              userBooks: { none: { userId } },
            },
            select: { id: true, slug: true, title: true, coverUrl: true },
            orderBy: [{ ratingsAvg: 'desc' }, { readersCount: 'desc' }],
            take: 4,
          })
        : [],
    ),
  ]);

  if (!entry) throw ApiError.notFound('Livro nao encontrado na sua biblioteca.');

  const days =
    entry.startedAt && entry.finishedAt
      ? Math.max(1, Math.round((entry.finishedAt.getTime() - entry.startedAt.getTime()) / 86_400_000))
      : null;

  const [totalRead] = await Promise.all([
    prisma.userBook.count({ where: { userId, status: ReadingStatus.READ } }),
  ]);

  return {
    book: entry.book,
    rating: entry.rating,
    hasReview: Boolean(review),
    daysReading: days,
    pagesRead: entry.book.pageCount ?? entry.currentPage,
    /** "Voce e mais 12 pessoas terminaram este livro." */
    companionsFinished: companions,
    booksReadTotal: totalRead,
    suggestedCommunities: communities,
    suggestedNextBooks: nextBooks,
  };
}
