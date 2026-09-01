/**
 * PostgreSQL embutido para desenvolvimento.
 *
 * Usado quando nao ha um PostgreSQL disponivel (nem local, nem via Docker).
 * E o PGlite: o proprio PostgreSQL compilado para WebAssembly, rodando dentro
 * do Node e falando o protocolo de rede do Postgres — entao o Prisma nao sabe
 * a diferenca. Os dados ficam em apps/api/.pgdata.
 *
 * Nao substitui um PostgreSQL de verdade em producao: e um atalho para
 * conseguir ver o produto rodando sem instalar nada.
 */
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(here, '..', '.pgdata');
const port = Number(process.env.RETROBOOK_DB_PORT ?? 5433);

mkdirSync(dataDir, { recursive: true });

const db = await PGlite.create({ dataDir });

const server = new PGLiteSocketServer({
  db,
  port,
  host: '127.0.0.1',
  // O padrao do pacote e 1 conexao. Com uma so, o pool do Prisma derruba a
  // sessao assim que abre a segunda — as queries ja sao serializadas por uma
  // fila interna, entao aceitar varias conexoes e seguro.
  maxConnections: 20,
});

await server.start();
console.log(`[retrobook:db] PostgreSQL embutido em 127.0.0.1:${port} (dados em apps/api/.pgdata)`);

async function shutdown() {
  try {
    await server.stop();
    await db.close();
  } finally {
    process.exit(0);
  }
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('message', (message) => {
  if (message === 'shutdown') void shutdown();
});
