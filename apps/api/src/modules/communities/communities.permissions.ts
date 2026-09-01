import { CommunityRole, MembershipStatus } from '@prisma/client';
import { ApiError } from '../../common/api-error';
import { prisma } from '../../database/prisma';

/** Hierarquia unica de papeis — comparacoes numericas evitam ifs espalhados. */
const RANK: Record<CommunityRole, number> = {
  MEMBER: 0,
  MODERATOR: 1,
  ADMIN: 2,
  OWNER: 3,
};

export interface Membership {
  id: string;
  role: CommunityRole;
  status: MembershipStatus;
  mutedUntil: Date | null;
}

export async function getMembership(communityId: string, userId?: string): Promise<Membership | null> {
  if (!userId) return null;
  const member = await prisma.communityMember.findUnique({
    where: { communityId_userId: { communityId, userId } },
    select: { id: true, role: true, status: true, mutedUntil: true },
  });
  return member;
}

export function isActiveMember(membership: Membership | null) {
  return membership?.status === MembershipStatus.ACTIVE;
}

export function canModerate(membership: Membership | null) {
  return isActiveMember(membership) && RANK[membership!.role] >= RANK.MODERATOR;
}

export function canAdminister(membership: Membership | null) {
  return isActiveMember(membership) && RANK[membership!.role] >= RANK.ADMIN;
}

export function isOwner(membership: Membership | null) {
  return isActiveMember(membership) && membership!.role === CommunityRole.OWNER;
}

export function canPost(membership: Membership | null, community: { allowMemberPosts: boolean }) {
  if (!isActiveMember(membership)) return false;
  if (membership!.mutedUntil && membership!.mutedUntil > new Date()) return false;
  if (!community.allowMemberPosts) return canModerate(membership);
  return true;
}

/** Um papel so pode agir sobre alguem estritamente abaixo dele. */
export function outranks(actor: Membership | null, target: { role: CommunityRole }) {
  if (!actor) return false;
  return RANK[actor.role] > RANK[target.role];
}

export async function assertCanModerate(communityId: string, userId: string) {
  const membership = await getMembership(communityId, userId);
  if (!canModerate(membership)) throw ApiError.forbidden('Apenas moderadores podem fazer isso.');
  return membership!;
}

export async function assertCanAdminister(communityId: string, userId: string) {
  const membership = await getMembership(communityId, userId);
  if (!canAdminister(membership)) throw ApiError.forbidden('Apenas administradores podem fazer isso.');
  return membership!;
}

/** Comunidade privada nao vaza conteudo para quem nao e membro. */
export function canViewContent(
  community: { privacy: 'PUBLIC' | 'PRIVATE' | 'EXCLUSIVE' },
  membership: Membership | null,
) {
  if (community.privacy === 'PUBLIC') return true;
  return isActiveMember(membership);
}
