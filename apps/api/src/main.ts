import { createApp } from './app';
import { env } from './config/env';
import { prisma } from './database/prisma';

async function bootstrap() {
  const app = createApp();
  const server = app.listen(env.PORT, () => {
    console.log(`[retrobook:api] ouvindo em http://localhost:${env.PORT}/api`);
    console.log(`[retrobook:api] provedor de livros: ${env.BOOK_PROVIDER}`);
  });

  const shutdown = async (signal: string) => {
    console.log(`[retrobook:api] ${signal} recebido, encerrando...`);
    server.close();
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

bootstrap().catch((error) => {
  console.error('[retrobook:api] falha ao iniciar', error);
  process.exit(1);
});
