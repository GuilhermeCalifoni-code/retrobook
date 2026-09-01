import { ReadingStatus, type ReadingGoalIntent } from '@prisma/client';
import { slugify } from '../../common/text';
import { prisma } from '../../database/prisma';
import { addToLibrary } from '../library/library.service';
import { getSuggestedPeople } from '../users/users.service';
import { getRecommendedCommunities } from '../communities/communities.service';
import { getRecommendedBooks } from '../discovery/discovery.service';

/**
 * Onboarding (secao 10). Cada etapa persiste sozinha: se a pessoa fechar o
 * navegador na etapa 3, volta exatamente onde parou em vez de recomecar.
 */

export async function saveInterests(userId: string, genreSlugs: string[], customGenres: string[] = []) {
  const genres = await prisma.genre.findMany({ where: { slug: { in: genreSlugs } }, select: { id: true } });

  const customIds: string[] = [];
  for (const name of customGenres.slice(0, 5)) {
    const slug = slugify(name);
    if (!slug) continue;
    const genre = await prisma.genre.upsert({
      where: { slug },
      update: {},
      create: { slug, name: name.trim(), isCustom: true },
    });
    customIds.push(genre.id);
  }

  const allIds = [...genres.map((g) => g.id), ...customIds];

  await prisma.$transaction([
    prisma.userGenre.deleteMany({ where: { userId } }),
    prisma.userGenre.createMany({ data: allIds.map((genreId) => ({ userId, genreId })), skipDuplicates: true }),
    prisma.profile.update({ where: { userId }, data: { onboardingStep: 2 } }),
  ]);

  return { count: allIds.length };
}

export async function saveOnboardingBooks(
  userId: string,
  input: { reading?: string[]; read?: string[]; wantToRead?: string[] },
) {
  const jobs: Promise<unknown>[] = [];
  for (const bookId of input.reading ?? []) jobs.push(addToLibrary(userId, { bookId, status: ReadingStatus.READING }));
  for (const bookId of input.read ?? []) jobs.push(addToLibrary(userId, { bookId, status: ReadingStatus.READ }));
  for (const bookId of input.wantToRead ?? [])
    jobs.push(addToLibrary(userId, { bookId, status: ReadingStatus.WANT_TO_READ }));

  await Promise.all(jobs);
  await prisma.profile.update({ where: { userId }, data: { onboardingStep: 3 } });
  return { count: jobs.length };
}

export async function saveGoal(userId: string, goal: ReadingGoalIntent) {
  await prisma.profile.update({ where: { userId }, data: { goal, onboardingStep: 4 } });
  return { goal };
}

/** Etapa 5: a primeira prova de valor do produto — pessoas e comunidades reais. */
export async function getOnboardingRecommendations(userId: string) {
  const [people, communities, books] = await Promise.all([
    getSuggestedPeople(userId, { limit: 6 }),
    getRecommendedCommunities(userId, 4),
    getRecommendedBooks(userId, 6),
  ]);
  return { people, communities, books };
}

export async function completeOnboarding(userId: string) {
  await prisma.profile.update({
    where: { userId },
    data: { onboardingCompleted: true, onboardingStep: 5 },
  });
  return { completed: true };
}
