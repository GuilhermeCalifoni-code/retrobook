import type { ReportTargetType } from '@prisma/client';
import { ApiError } from '../../common/api-error';
import { stripHtml } from '../../common/text';
import { prisma } from '../../database/prisma';

export const REPORT_REASONS = [
  { code: 'spam', label: 'Spam ou divulgacao' },
  { code: 'harassment', label: 'Ataque a outra pessoa' },
  { code: 'spoiler', label: 'Spoiler sem aviso' },
  { code: 'off_topic', label: 'Fora do tema da comunidade' },
  { code: 'copyright', label: 'Uso indevido de conteudo protegido' },
  { code: 'other', label: 'Outro motivo' },
] as const;

export async function createReport(
  reporterId: string,
  input: { targetType: ReportTargetType; targetId: string; reason: string; details?: string },
) {
  if (!REPORT_REASONS.some((r) => r.code === input.reason)) {
    throw ApiError.badRequest('Selecione um motivo valido.');
  }

  const duplicate = await prisma.report.findFirst({
    where: { reporterId, targetType: input.targetType, targetId: input.targetId, status: 'OPEN' },
  });
  if (duplicate) return { id: duplicate.id, alreadyReported: true };

  const report = await prisma.report.create({
    data: {
      reporterId,
      targetType: input.targetType,
      targetId: input.targetId,
      reason: input.reason,
      details: input.details ? stripHtml(input.details) : undefined,
    },
  });
  return { id: report.id, alreadyReported: false };
}
