import { PlanTier } from '@prisma/client';
import { ApiError } from '../../common/api-error';
import { prisma } from '../../database/prisma';

/**
 * Regras de plano (secao 32). O limite de 3 membros no plano gratuito e
 * intencional: comunidades pequenas nascem de graca, comunidades que crescem
 * viram assinatura. Toda checagem passa por aqui — nunca espalhada em controllers.
 */

export async function getUserPlan(userId: string) {
  const subscription = await prisma.subscription.findUnique({
    where: { userId },
    include: { plan: true },
  });
  if (subscription?.plan) return subscription.plan;

  const free = await prisma.plan.findUnique({ where: { tier: PlanTier.FREE } });
  if (!free) throw new Error('Plano gratuito nao encontrado. Rode o seed do banco.');
  return free;
}

export async function assertCanCreateCommunity(userId: string, privacy: 'PUBLIC' | 'PRIVATE' | 'EXCLUSIVE') {
  const plan = await getUserPlan(userId);
  const owned = await prisma.community.count({ where: { ownerId: userId, isArchived: false } });

  if (owned >= plan.maxCommunities) {
    throw ApiError.planLimit(
      plan.maxCommunities === 1
        ? 'O plano gratuito permite criar 1 comunidade. Migre para o Pro para criar mais.'
        : `Seu plano permite ate ${plan.maxCommunities} comunidades.`,
      { limit: plan.maxCommunities, current: owned, tier: plan.tier, feature: 'communities' },
    );
  }

  if (privacy !== 'PUBLIC' && !plan.allowPrivateCommunities) {
    throw ApiError.planLimit('Comunidades privadas e exclusivas fazem parte do plano Pro.', {
      tier: plan.tier,
      feature: 'private_communities',
    });
  }

  return plan;
}

/** Chamado antes de aceitar um novo membro (entrada direta ou aprovacao). */
export async function assertCommunityHasRoom(communityId: string) {
  const community = await prisma.community.findUniqueOrThrow({
    where: { id: communityId },
    select: { ownerId: true, membersCount: true, name: true },
  });
  const plan = await getUserPlan(community.ownerId);

  if (community.membersCount >= plan.maxMembersPerCommunity) {
    throw ApiError.planLimit(
      `${community.name} atingiu o limite de ${plan.maxMembersPerCommunity} membros do plano atual.`,
      {
        limit: plan.maxMembersPerCommunity,
        current: community.membersCount,
        tier: plan.tier,
        feature: 'community_members',
      },
    );
  }
  return plan;
}

export async function assertAnalyticsAllowed(userId: string) {
  const plan = await getUserPlan(userId);
  if (!plan.allowAnalytics) {
    throw ApiError.planLimit('Analytics de comunidade faz parte do plano Pro.', {
      tier: plan.tier,
      feature: 'analytics',
    });
  }
  return plan;
}

export async function listPlans() {
  const plans = await prisma.plan.findMany({ where: { isPubliclyListed: true }, orderBy: { priceCents: 'asc' } });
  return plans.map((p) => ({
    tier: p.tier,
    name: p.name,
    tagline: p.tagline,
    priceCents: p.priceCents,
    currency: p.currency,
    features: {
      maxCommunities: p.maxCommunities,
      maxMembersPerCommunity: p.maxMembersPerCommunity,
      allowPrivateCommunities: p.allowPrivateCommunities,
      allowAnalytics: p.allowAnalytics,
      allowCustomBranding: p.allowCustomBranding,
      advancedModeration: p.advancedModeration,
    },
  }));
}

export async function getPlanUsage(userId: string) {
  const plan = await getUserPlan(userId);
  const [ownedCommunities, largest] = await Promise.all([
    prisma.community.count({ where: { ownerId: userId, isArchived: false } }),
    prisma.community.findFirst({
      where: { ownerId: userId },
      orderBy: { membersCount: 'desc' },
      select: { name: true, membersCount: true, slug: true },
    }),
  ]);
  return {
    tier: plan.tier,
    name: plan.name,
    communities: { used: ownedCommunities, limit: plan.maxCommunities },
    members: { largest: largest?.membersCount ?? 0, limit: plan.maxMembersPerCommunity, community: largest },
    allowPrivateCommunities: plan.allowPrivateCommunities,
    allowAnalytics: plan.allowAnalytics,
    advancedModeration: plan.advancedModeration,
  };
}
