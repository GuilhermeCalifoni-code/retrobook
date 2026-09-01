import { CommunityRole, MembershipStatus, PlanTier, PostType, PrismaClient, ReadingStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { BOOKS, COMMUNITIES, EXTRA_COMMUNITIES, GENRES, PLANS, POSTS, REVIEWS, USERS } from './seed.data';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'retrobook123';

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[^\x00-\x7F]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function daysAgo(n: number) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}

async function reset() {
  // Ordem importa: filhos antes dos pais.
  await prisma.$transaction([
    prisma.reaction.deleteMany(),
    prisma.savedPost.deleteMany(),
    prisma.comment.deleteMany(),
    prisma.postTag.deleteMany(),
    prisma.post.deleteMany(),
    prisma.message.deleteMany(),
    prisma.conversationParticipant.deleteMany(),
    prisma.conversation.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.readingProgress.deleteMany(),
    prisma.review.deleteMany(),
    prisma.userBook.deleteMany(),
    prisma.userAchievement.deleteMany(),
    prisma.communityBook.deleteMany(),
    prisma.communityTag.deleteMany(),
    prisma.communityRule.deleteMany(),
    prisma.communityInvitation.deleteMany(),
    prisma.communityMember.deleteMany(),
    prisma.community.deleteMany(),
    prisma.follow.deleteMany(),
    prisma.block.deleteMany(),
    prisma.report.deleteMany(),
    prisma.userGenre.deleteMany(),
    prisma.bookGenre.deleteMany(),
    prisma.bookAuthor.deleteMany(),
    prisma.book.deleteMany(),
    prisma.author.deleteMany(),
    prisma.genre.deleteMany(),
    prisma.tag.deleteMany(),
    prisma.session.deleteMany(),
    prisma.authToken.deleteMany(),
    prisma.socialAccount.deleteMany(),
    prisma.subscription.deleteMany(),
    prisma.plan.deleteMany(),
    prisma.achievement.deleteMany(),
    prisma.profile.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

async function seedPlans() {
  for (const plan of PLANS) await prisma.plan.create({ data: { ...plan, tier: plan.tier as PlanTier } });
  return prisma.plan.findMany();
}

async function seedAchievements() {
  const { ACHIEVEMENT_CATALOG } = await import('../src/modules/achievements/achievements.service');
  for (const a of ACHIEVEMENT_CATALOG) {
    await prisma.achievement.create({
      data: {
        code: a.code,
        name: a.name,
        description: a.description,
        icon: a.icon,
        category: a.category,
        threshold: a.threshold,
      },
    });
  }
}

async function main() {
  console.log('[seed] limpando base...');
  await reset();

  console.log('[seed] planos e conquistas...');
  const plans = await seedPlans();
  const freePlan = plans.find((p) => p.tier === PlanTier.FREE)!;
  const proPlan = plans.find((p) => p.tier === PlanTier.PRO)!;
  await seedAchievements();

  console.log('[seed] generos...');
  const genreMap = new Map<string, string>();
  for (const genre of GENRES) {
    const created = await prisma.genre.create({ data: genre });
    genreMap.set(genre.slug, created.id);
  }

  console.log('[seed] autores e livros...');
  const authorMap = new Map<string, string>();
  const bookMap = new Map<string, { id: string; pages: number }>();

  for (const book of BOOKS) {
    const authorSlug = slugify(book.author);
    let authorId = authorMap.get(authorSlug);
    if (!authorId) {
      const author = await prisma.author.create({ data: { slug: authorSlug, name: book.author } });
      authorId = author.id;
      authorMap.set(authorSlug, authorId);
    }

    const created = await prisma.book.create({
      data: {
        slug: book.slug,
        title: book.title,
        subtitle: book.subtitle,
        description: book.description,
        pageCount: book.pages,
        publishedYear: book.year,
        language: 'pt-BR',
        provider: 'local',
        authors: { create: [{ authorId, order: 0 }] },
        genres: {
          create: book.genres
            .map((slug) => genreMap.get(slug))
            .filter((id): id is string => Boolean(id))
            .map((genreId) => ({ genreId })),
        },
      },
    });
    bookMap.set(book.slug, { id: created.id, pages: book.pages });
  }

  console.log('[seed] pessoas...');
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const userMap = new Map<string, string>();

  for (const person of USERS) {
    const user = await prisma.user.create({
      data: {
        email: person.email,
        passwordHash,
        emailVerifiedAt: new Date(),
        lastSeenAt: daysAgo(Math.random()),
        profile: {
          create: {
            name: person.name,
            username: person.username,
            bio: person.bio,
            location: person.location,
            onboardingCompleted: true,
            onboardingStep: 5,
          },
        },
        subscription: { create: { planId: person.username === 'ana.reis' ? proPlan.id : freePlan.id } },
      },
    });
    userMap.set(person.username, user.id);

    await prisma.userGenre.createMany({
      data: person.genres
        .map((slug) => genreMap.get(slug))
        .filter((id): id is string => Boolean(id))
        .map((genreId) => ({ userId: user.id, genreId })),
      skipDuplicates: true,
    });
  }

  console.log('[seed] bibliotecas pessoais...');
  for (const person of USERS) {
    const userId = userMap.get(person.username)!;
    const favorites = new Set(person.favorites ?? []);

    const entries: { slug: string; status: ReadingStatus }[] = [
      ...person.reading.map((slug) => ({ slug, status: ReadingStatus.READING })),
      ...person.read.map((slug) => ({ slug, status: ReadingStatus.READ })),
      ...person.wantToRead.map((slug) => ({ slug, status: ReadingStatus.WANT_TO_READ })),
    ];

    for (const entry of entries) {
      const book = bookMap.get(entry.slug);
      if (!book) continue;

      const isReading = entry.status === ReadingStatus.READING;
      const isRead = entry.status === ReadingStatus.READ;
      const progress = isReading ? 20 + Math.floor(Math.random() * 60) : isRead ? 100 : 0;
      const currentPage = Math.round((progress / 100) * book.pages);

      const userBook = await prisma.userBook.create({
        data: {
          userId,
          bookId: book.id,
          status: entry.status,
          progress,
          currentPage,
          isFavorite: favorites.has(entry.slug),
          rating: isRead ? 4 + Math.round(Math.random()) : null,
          startedAt: isReading || isRead ? daysAgo(30 + Math.random() * 60) : null,
          finishedAt: isRead ? daysAgo(Math.random() * 120) : null,
          lastReadAt: isReading ? daysAgo(Math.random() * 5) : isRead ? daysAgo(Math.random() * 120) : null,
        },
      });

      // Historico de leitura: alimenta os graficos de "Minha leitura".
      if (isReading || isRead) {
        const steps = 3;
        for (let i = 1; i <= steps; i += 1) {
          const percent = Math.round((progress / steps) * i);
          await prisma.readingProgress.create({
            data: {
              userBookId: userBook.id,
              userId,
              bookId: book.id,
              page: Math.round((percent / 100) * book.pages),
              percent,
              pagesDelta: Math.round((book.pages * (progress / 100)) / steps),
              createdAt: daysAgo(60 - i * 12 + Math.random() * 5),
            },
          });
        }
      }
    }
  }

  console.log('[seed] resenhas...');
  for (const review of REVIEWS) {
    const userId = userMap.get(review.user);
    const book = bookMap.get(review.book);
    if (!userId || !book) continue;
    await prisma.review.create({
      data: {
        userId,
        bookId: book.id,
        rating: review.rating,
        title: review.title,
        content: review.content,
        containsSpoiler: review.spoiler ?? false,
        likesCount: Math.floor(Math.random() * 24),
        createdAt: daysAgo(Math.random() * 60),
      },
    });
  }

  console.log('[seed] rede de seguidores...');
  const usernames = USERS.map((u) => u.username);
  for (const person of USERS) {
    const followerId = userMap.get(person.username)!;
    const targets = usernames.filter((u) => u !== person.username).sort(() => Math.random() - 0.5).slice(0, 5);
    for (const target of targets) {
      const followingId = userMap.get(target)!;
      await prisma.follow.upsert({
        where: { followerId_followingId: { followerId, followingId } },
        update: {},
        create: { followerId, followingId, createdAt: daysAgo(Math.random() * 90) },
      });
    }
  }
  for (const person of USERS) {
    const userId = userMap.get(person.username)!;
    const [followers, following] = await Promise.all([
      prisma.follow.count({ where: { followingId: userId } }),
      prisma.follow.count({ where: { followerId: userId } }),
    ]);
    await prisma.profile.update({
      where: { userId },
      data: { followersCount: followers, followingCount: following },
    });
  }

  console.log('[seed] comunidades...');
  const communityMap = new Map<string, string>();
  const tagMap = new Map<string, string>();

  for (const community of [...COMMUNITIES, ...EXTRA_COMMUNITIES]) {
    const ownerId = userMap.get(community.owner)!;
    const memberUsernames = [community.owner, ...community.moderators, ...community.members];

    const created = await prisma.community.create({
      data: {
        slug: community.slug,
        name: community.name,
        tagline: community.tagline,
        description: community.description,
        accentColor: community.accentColor,
        privacy: community.privacy,
        genreId: genreMap.get(community.genre),
        ownerId,
        isFeatured: true,
        requireApproval: community.privacy !== 'PUBLIC',
        membersCount: memberUsernames.length,
        createdAt: daysAgo(
          community.activity === 'new' ? 3 + Math.random() * 6 : 120 + Math.random() * 200,
        ),
        rules: {
          create: community.rules.map((rule, order) => ({
            order,
            title: rule.title,
            description: rule.description,
          })),
        },
        books: {
          create: community.books
            .map((slug) => bookMap.get(slug))
            .filter((b): b is { id: string; pages: number } => Boolean(b))
            .map((b) => ({ bookId: b.id })),
        },
      },
    });
    communityMap.set(community.slug, created.id);

    for (const tagName of community.tags) {
      const slug = slugify(tagName);
      let tagId = tagMap.get(slug);
      if (!tagId) {
        const tag = await prisma.tag.create({ data: { slug, name: tagName } });
        tagId = tag.id;
        tagMap.set(slug, tagId);
      }
      await prisma.communityTag.create({ data: { communityId: created.id, tagId } });
      await prisma.tag.update({ where: { id: tagId }, data: { usageCount: { increment: 1 } } });
    }

    await prisma.communityMember.create({
      data: { communityId: created.id, userId: ownerId, role: CommunityRole.OWNER, status: MembershipStatus.ACTIVE },
    });
    for (const username of community.moderators) {
      await prisma.communityMember.create({
        data: {
          communityId: created.id,
          userId: userMap.get(username)!,
          role: CommunityRole.MODERATOR,
          status: MembershipStatus.ACTIVE,
        },
      });
    }
    for (const username of community.members) {
      await prisma.communityMember.create({
        data: {
          communityId: created.id,
          userId: userMap.get(username)!,
          role: CommunityRole.MEMBER,
          status: MembershipStatus.ACTIVE,
          joinedAt: daysAgo(Math.random() * 100),
        },
      });
    }
  }

  console.log('[seed] discussoes e comentarios...');
  for (const post of POSTS) {
    const authorId = userMap.get(post.author)!;
    const communityId = post.community ? communityMap.get(post.community) : undefined;
    const bookId = post.book ? bookMap.get(post.book)?.id : undefined;

    const created = await prisma.post.create({
      data: {
        authorId,
        communityId,
        bookId,
        type: post.type as PostType,
        title: post.title,
        content: post.content,
        containsSpoiler: post.spoiler ?? false,
        spoilerScope: post.spoilerScope,
        quoteText: post.quote,
        quotePage: post.quotePage,
        createdAt: daysAgo(post.daysAgo),
        likesCount: 0,
      },
    });

    for (const tagName of post.tags ?? []) {
      const slug = slugify(tagName);
      let tagId = tagMap.get(slug);
      if (!tagId) {
        const tag = await prisma.tag.create({ data: { slug, name: tagName } });
        tagId = tag.id;
        tagMap.set(slug, tagId);
      }
      await prisma.postTag.create({ data: { postId: created.id, tagId } });
    }

    // Curtidas reais (linhas em Reaction), para que o contador seja verdadeiro.
    const likers = usernames.filter((u) => u !== post.author).sort(() => Math.random() - 0.5).slice(0, 2 + Math.floor(Math.random() * 6));
    for (const username of likers) {
      await prisma.reaction.create({ data: { userId: userMap.get(username)!, postId: created.id } });
    }
    await prisma.post.update({ where: { id: created.id }, data: { likesCount: likers.length } });

    let commentCount = 0;
    for (const comment of post.comments) {
      const parent = await prisma.comment.create({
        data: {
          postId: created.id,
          authorId: userMap.get(comment.author)!,
          content: comment.content,
          containsSpoiler: comment.spoiler ?? false,
          likesCount: Math.floor(Math.random() * 8),
          createdAt: daysAgo(Math.max(0, post.daysAgo - 0.5)),
        },
      });
      commentCount += 1;

      for (const reply of comment.replies ?? []) {
        await prisma.comment.create({
          data: {
            postId: created.id,
            parentId: parent.id,
            authorId: userMap.get(reply.author)!,
            content: reply.content,
            likesCount: Math.floor(Math.random() * 4),
            createdAt: daysAgo(Math.max(0, post.daysAgo - 0.7)),
          },
        });
        commentCount += 1;
      }
    }
    await prisma.post.update({ where: { id: created.id }, data: { commentsCount: commentCount } });
  }

  for (const [slug, id] of communityMap) {
    void slug;
    const postsCount = await prisma.post.count({ where: { communityId: id } });
    await prisma.community.update({ where: { id }, data: { postsCount } });
  }

  console.log('[seed] contadores dos livros...');
  for (const [, book] of bookMap) {
    const [agg, readers, reading] = await Promise.all([
      prisma.userBook.aggregate({
        where: { bookId: book.id, rating: { not: null } },
        _avg: { rating: true },
        _count: { rating: true },
      }),
      prisma.userBook.count({ where: { bookId: book.id, status: { in: ['READING', 'READ'] } } }),
      prisma.userBook.count({ where: { bookId: book.id, status: 'READING' } }),
    ]);
    await prisma.book.update({
      where: { id: book.id },
      data: {
        ratingsAvg: agg._avg.rating ?? 0,
        ratingsCount: agg._count.rating,
        readersCount: readers,
        readingCount: reading,
      },
    });
  }

  console.log('[seed] conversas e notificacoes...');
  const guilherme = userMap.get('guilherme')!;
  const ana = userMap.get('ana.reis')!;
  const conversation = await prisma.conversation.create({
    data: {
      participants: { create: [{ userId: guilherme }, { userId: ana }] },
      lastMessageAt: daysAgo(0.2),
    },
  });
  await prisma.message.createMany({
    data: [
      {
        conversationId: conversation.id,
        senderId: ana,
        body: 'Vi que voce esta lendo Duna tambem. Em que parte esta?',
        createdAt: daysAgo(1),
      },
      {
        conversationId: conversation.id,
        senderId: guilherme,
        body: 'Pagina 182, comecando a parte dos fremen. Sem spoiler, por favor.',
        createdAt: daysAgo(0.8),
      },
      {
        conversationId: conversation.id,
        senderId: ana,
        body: 'Prometo. Quando chegar na metade me avisa que tenho uma teoria para te contar.',
        createdAt: daysAgo(0.2),
      },
    ],
  });

  const notifications = [
    {
      userId: guilherme,
      actorId: ana,
      type: 'FOLLOW' as const,
      title: 'Ana Reis comecou a seguir voce.',
      href: '/u/ana.reis',
    },
    {
      userId: guilherme,
      actorId: userMap.get('bea.lima')!,
      type: 'COMMENT' as const,
      title: 'Beatriz Lima comentou na sua discussao.',
      body: 'Estou na 210. Podemos combinar de comentar so ate o fim da parte 1.',
      href: '/feed',
    },
    {
      userId: guilherme,
      type: 'BOOK_MATCH' as const,
      title: 'Voce tem 4 livros em comum com Caio Duarte.',
      body: 'Duna, Neuromancer e mais dois. Vale uma conversa.',
      href: '/u/caio.duarte',
    },
    {
      userId: guilherme,
      type: 'COMMUNITY_MATCH' as const,
      title: 'Uma comunidade nova combina com o que voce le.',
      body: 'Futuros Possiveis reune leitores de ficcao cientifica.',
      href: '/c/futuros-possiveis',
    },
    {
      userId: guilherme,
      actorId: userMap.get('caio.duarte')!,
      type: 'COMMUNITY_POST' as const,
      title: 'Nova discussao em Clube Duna',
      body: 'Bloco 3: o deserto como personagem',
      href: '/c/clube-duna',
    },
  ];
  for (const [index, notification] of notifications.entries()) {
    await prisma.notification.create({
      data: { ...notification, createdAt: daysAgo(index * 0.6), readAt: index > 2 ? daysAgo(index * 0.3) : null },
    });
  }

  console.log('[seed] conquistas...');
  const { evaluateAchievements } = await import('../src/modules/achievements/achievements.service');
  for (const username of usernames) {
    await evaluateAchievements(userMap.get(username)!);
  }
  // As conquistas geram notificacoes; limpamos as de demonstracao dos outros perfis.
  await prisma.notification.deleteMany({ where: { type: 'ACHIEVEMENT', userId: { not: guilherme } } });

  console.log('');
  console.log('  RetroBook semeado com sucesso.');
  console.log('  ------------------------------------------');
  console.log(`  Livros:      ${BOOKS.length}`);
  console.log(`  Pessoas:     ${USERS.length}`);
  console.log(`  Comunidades: ${COMMUNITIES.length}`);
  console.log(`  Discussoes:  ${POSTS.length}`);
  console.log('  ------------------------------------------');
  console.log('  Conta de demonstracao:');
  console.log('    e-mail: guilherme@retrobook.app');
  console.log(`    senha:  ${DEMO_PASSWORD}`);
  console.log('  (todas as contas de exemplo usam a mesma senha)');
  console.log('');
}

main()
  .catch((error) => {
    console.error('[seed] falhou', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
