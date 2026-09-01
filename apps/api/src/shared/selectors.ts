import { Prisma } from '@prisma/client';

/** Perfil publico enxuto — o que aparece em avatares, cards e listas. */
export const publicUserSelect = Prisma.validator<Prisma.UserSelect>()({
  id: true,
  profile: {
    select: {
      name: true,
      username: true,
      avatarUrl: true,
      bio: true,
      visibility: true,
    },
  },
});

export const bookCardSelect = Prisma.validator<Prisma.BookSelect>()({
  id: true,
  slug: true,
  title: true,
  subtitle: true,
  coverUrl: true,
  pageCount: true,
  publishedYear: true,
  ratingsAvg: true,
  ratingsCount: true,
  readersCount: true,
  readingCount: true,
  authors: { select: { author: { select: { id: true, name: true, slug: true } } }, orderBy: { order: 'asc' } },
  genres: { select: { genre: { select: { id: true, name: true, slug: true } } } },
});

export const communityCardSelect = Prisma.validator<Prisma.CommunitySelect>()({
  id: true,
  slug: true,
  name: true,
  tagline: true,
  description: true,
  avatarUrl: true,
  coverUrl: true,
  accentColor: true,
  privacy: true,
  membersCount: true,
  postsCount: true,
  genre: { select: { id: true, name: true, slug: true } },
  tags: { select: { tag: { select: { slug: true, name: true } } } },
});

export const postCardSelect = Prisma.validator<Prisma.PostSelect>()({
  id: true,
  type: true,
  title: true,
  content: true,
  containsSpoiler: true,
  spoilerScope: true,
  spoilerScopeType: true,
  spoilerScopeValue: true,
  quoteText: true,
  quotePage: true,
  progressPage: true,
  progressPercent: true,
  progressChapter: true,
  isPinned: true,
  isLocked: true,
  isRemoved: true,
  likesCount: true,
  commentsCount: true,
  createdAt: true,
  author: { select: publicUserSelect },
  community: { select: { id: true, slug: true, name: true, avatarUrl: true, accentColor: true, privacy: true } },
  book: { select: { id: true, slug: true, title: true, coverUrl: true } },
  tags: { select: { tag: { select: { slug: true, name: true } } } },
});

export type PublicUser = Prisma.UserGetPayload<{ select: typeof publicUserSelect }>;
export type BookCard = Prisma.BookGetPayload<{ select: typeof bookCardSelect }>;
export type CommunityCard = Prisma.CommunityGetPayload<{ select: typeof communityCardSelect }>;
export type PostCard = Prisma.PostGetPayload<{ select: typeof postCardSelect }>;

// -- Serializers: achatam as tabelas de juncao antes de sair pela API ---------

export function serializeUser(user: PublicUser) {
  return {
    id: user.id,
    name: user.profile?.name ?? 'Leitor',
    username: user.profile?.username ?? 'leitor',
    avatarUrl: user.profile?.avatarUrl ?? null,
    bio: user.profile?.bio ?? null,
  };
}

export function serializeBook(book: BookCard) {
  return {
    id: book.id,
    slug: book.slug,
    title: book.title,
    subtitle: book.subtitle,
    coverUrl: book.coverUrl,
    pageCount: book.pageCount,
    publishedYear: book.publishedYear,
    ratingsAvg: Number(book.ratingsAvg.toFixed(2)),
    ratingsCount: book.ratingsCount,
    readersCount: book.readersCount,
    readingCount: book.readingCount,
    authors: book.authors.map((a) => a.author),
    genres: book.genres.map((g) => g.genre),
  };
}

export function serializeCommunity(community: CommunityCard) {
  return {
    id: community.id,
    slug: community.slug,
    name: community.name,
    tagline: community.tagline,
    description: community.description,
    avatarUrl: community.avatarUrl,
    coverUrl: community.coverUrl,
    accentColor: community.accentColor,
    privacy: community.privacy,
    membersCount: community.membersCount,
    postsCount: community.postsCount,
    genre: community.genre,
    tags: community.tags.map((t) => t.tag),
  };
}

export function serializePost(
  post: PostCard,
  viewer?: {
    liked?: boolean;
    saved?: boolean;
    canModerate?: boolean;
    /** Decidido em spoiler.service: a UI so obedece. */
    spoiler?: { hidden: boolean; label: string | null; explanation: string | null };
  },
) {
  return {
    id: post.id,
    type: post.type,
    title: post.title,
    // Post removido nao devolve conteudo, apenas a lapide.
    content: post.isRemoved ? 'Este conteudo foi removido pela moderacao.' : post.content,
    containsSpoiler: post.containsSpoiler,
    spoilerScope: post.spoilerScope,
    spoilerScopeType: post.spoilerScopeType,
    spoilerScopeValue: post.spoilerScopeValue,
    /** Sem contexto do leitor, o padrao seguro e esconder. */
    viewerSpoiler: viewer?.spoiler ?? {
      hidden: post.containsSpoiler,
      label: post.spoilerScope,
      explanation: null,
    },
    progressPage: post.progressPage,
    progressPercent: post.progressPercent,
    progressChapter: post.progressChapter,
    quoteText: post.isRemoved ? null : post.quoteText,
    quotePage: post.quotePage,
    isPinned: post.isPinned,
    isLocked: post.isLocked,
    isRemoved: post.isRemoved,
    likesCount: post.likesCount,
    commentsCount: post.commentsCount,
    createdAt: post.createdAt,
    author: serializeUser(post.author),
    community: post.community,
    book: post.book,
    tags: post.tags.map((t) => t.tag),
    viewerHasLiked: viewer?.liked ?? false,
    viewerHasSaved: viewer?.saved ?? false,
    viewerCanModerate: viewer?.canModerate ?? false,
  };
}
