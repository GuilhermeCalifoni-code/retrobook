/**
 * Diz em uma palavra o estado do banco, para o launcher decidir o que fazer.
 *   unreachable — nao deu para conectar
 *   empty       — conectou, mas nao ha dados de demonstracao
 *   ready       — conectado e semeado
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({ log: [] });

try {
  const users = await prisma.user.count();
  console.log(users > 0 ? 'ready' : 'empty');
} catch (error) {
  // Tabela inexistente tambem significa "precisa preparar".
  const code = error?.code ?? '';
  console.log(code === 'P2021' || code === 'P2022' ? 'empty' : 'unreachable');
} finally {
  await prisma.$disconnect();
}
