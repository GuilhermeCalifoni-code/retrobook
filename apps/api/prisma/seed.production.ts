/**
 * Seed de PRODUCAO.
 *
 * Diferente do seed de desenvolvimento (prisma/seed.ts), este script:
 *
 *  1. **Nunca apaga nada.** O seed de dev comeca com um `reset()` que limpa a
 *     base inteira. Rodar aquilo em producao destruiria contas reais. Aqui nao
 *     existe delete algum.
 *  2. **E idempotente.** Usa `upsert` por chave natural (slug/tier/codigo),
 *     entao rodar duas vezes nao duplica e nao quebra.
 *  3. **So insere dado de referencia**, nunca dado social. Planos, conquistas,
 *     generos, autores e livros sao o catalogo que o produto precisa para
 *     funcionar — nao sao conteudo fingindo ser de gente real.
 *
 * O que este script deliberadamente NAO cria: usuarios, comunidades, posts,
 * comentarios, resenhas, seguidores. Uma rede social recem-lancada esta vazia,
 * e povoa-la com pessoas inventadas seria mentir para quem chega primeiro.
 */
import { PlanTier, PrismaClient } from '@prisma/client';
import { BOOKS, GENRES, PLANS } from './seed.data';
import { ACHIEVEMENT_CATALOG } from '../src/modules/achievements/achievements.service';

const prisma = new PrismaClient();

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[^\x00-\x7F]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function seedPlans() {
  for (const plan of PLANS) {
    const { tier, ...rest } = plan;
    const data = { ...rest, tier: tier as PlanTier };
    await prisma.plan.upsert({ where: { tier: tier as PlanTier }, create: data, update: rest });
  }
  console.log(`[seed:prod] planos: ${PLANS.length}`);
}

async function seedAchievements() {
  for (const a of ACHIEVEMENT_CATALOG) {
    const data = {
      name: a.name,
      description: a.description,
      icon: a.icon,
      category: a.category,
      threshold: a.threshold,
    };
    await prisma.achievement.upsert({ where: { code: a.code }, create: { code: a.code, ...data }, update: data });
  }
  console.log(`[seed:prod] conquistas: ${ACHIEVEMENT_CATALOG.length}`);
}

async function seedGenres() {
  for (const genre of GENRES) {
    await prisma.genre.upsert({
      where: { slug: genre.slug },
      create: genre,
      update: { name: genre.name },
    });
  }
  console.log(`[seed:prod] generos: ${GENRES.length}`);
}

async function seedCatalog() {
  const genres = await prisma.genre.findMany({ select: { id: true, slug: true } });
  const genreMap = new Map(genres.map((g) => [g.slug, g.id]));
  let created = 0;
  let kept = 0;

  for (const book of BOOKS) {
    const existing = await prisma.book.findUnique({ where: { slug: book.slug }, select: { id: true } });
    if (existing) {
      kept += 1;
      continue;
    }

    const authorSlug = slugify(book.author);
    const author = await prisma.author.upsert({
      where: { slug: authorSlug },
      create: { slug: authorSlug, name: book.author },
      update: {},
    });

    await prisma.book.create({
      data: {
        slug: book.slug,
        title: book.title,
        subtitle: book.subtitle,
        description: book.description,
        pageCount: book.pages,
        publishedYear: book.year,
        language: 'pt-BR',
        provider: 'local',
        authors: { create: [{ authorId: author.id, order: 0 }] },
        genres: {
          create: book.genres
            .map((slug) => genreMap.get(slug))
            .filter((id): id is string => Boolean(id))
            .map((genreId) => ({ genreId })),
        },
      },
    });
    created += 1;
  }

  console.log(`[seed:prod] livros: ${created} criados, ${kept} ja existiam`);
}

async function main() {
  const users = await prisma.user.count();
  console.log(`[seed:prod] base com ${users} usuario(s) — nada sera apagado.`);

  await seedPlans();
  await seedAchievements();
  await seedGenres();
  await seedCatalog();

  console.log('[seed:prod] concluido.');
}

main()
  .catch((error) => {
    console.error('[seed:prod] falhou', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
