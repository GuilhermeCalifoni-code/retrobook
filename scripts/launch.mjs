#!/usr/bin/env node
/**
 * RetroBook — inicializador.
 *
 * Faz o caminho inteiro entre "acabei de abrir o projeto" e "o app esta na
 * minha tela": instala o que falta, encontra (ou levanta) um PostgreSQL,
 * prepara o banco, sobe API e Web e abre o navegador.
 *
 * A escolha do banco segue esta ordem, da melhor para a mais conveniente:
 *   1. Um PostgreSQL ja acessivel na porta configurada
 *   2. O container do docker-compose
 *   3. O PostgreSQL embutido (PGlite), que nao precisa de instalacao nenhuma
 */
import { spawn, spawnSync } from 'node:child_process';
import { createConnection } from 'node:net';
import { copyFileSync, existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apiDir = path.join(root, 'apps', 'api');
const webDir = path.join(root, 'apps', 'web');
const isWindows = process.platform === 'win32';

/** No Windows, npm/npx sao .cmd; resolver o nome evita precisar de shell. */
const bin = (name) => (isWindows ? `${name}.cmd` : name);

const API_PORT = 4000;
const WEB_PORT = 5173;
const EMBEDDED_DB_PORT = 5433;
const EMBEDDED_DB_URL = `postgresql://retrobook:retrobook@localhost:${EMBEDDED_DB_PORT}/retrobook?schema=public&pgbouncer=true`;

const E = String.fromCharCode(27);
const color = {
  reset: E + '[0m',
  dim: E + '[2m',
  bold: E + '[1m',
  red: E + '[31m',
  green: E + '[32m',
  gold: E + '[33m',
  wine: E + '[35m',
};

const children = [];
let shuttingDown = false;

/**
 * Fechar a janela do terminal mata o launcher sem passar pelo encerramento,
 * deixando banco, API e Vite orfaos. Guardamos os PIDs em disco para que a
 * proxima execucao limpe o que sobrou — assim rodar de novo sempre funciona.
 */
const pidFile = path.join(root, 'node_modules', '.retrobook-pids.json');

function rememberPids() {
  try {
    const pids = children.map(({ child }) => child.pid).filter(Boolean);
    writeFileSync(pidFile, JSON.stringify(pids));
  } catch {
    /* rastrear PIDs e conveniencia, nao pode derrubar o launcher */
  }
}

function killTree(pid) {
  try {
    if (isWindows) spawnSync('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore' });
    else process.kill(pid, 'SIGTERM');
  } catch {
    /* processo ja encerrado */
  }
}

function cleanupPreviousRun() {
  if (!existsSync(pidFile)) return;
  try {
    const pids = JSON.parse(readFileSync(pidFile, 'utf8'));
    if (Array.isArray(pids) && pids.length) {
      let cleaned = 0;
      for (const pid of pids) {
        try {
          process.kill(pid, 0); // so mata o que ainda existe
          killTree(pid);
          cleaned += 1;
        } catch {
          /* ja morreu */
        }
      }
      if (cleaned) warn(`Encerrando ${cleaned} processo(s) de uma execucao anterior...`);
    }
  } catch {
    /* arquivo corrompido: seguimos em frente */
  }
  try {
    rmSync(pidFile, { force: true });
  } catch {
    /* sem problema */
  }
}

function log(message) {
  console.log(message);
}
function step(message) {
  console.log(`${color.wine}›${color.reset} ${message}`);
}
function ok(message) {
  console.log(`${color.green}✓${color.reset} ${message}`);
}
function warn(message) {
  console.log(`${color.gold}!${color.reset} ${message}`);
}
function fail(message) {
  console.log(`${color.red}✗${color.reset} ${message}`);
}

function banner() {
  log('');
  log(`  ${color.wine}${color.bold}RetroBook${color.reset}`);
  log(`  ${color.dim}Leia. Encontre. Compartilhe.${color.reset}`);
  log('');
}

/** Executa e espera, herdando a saida quando `quiet` for falso. */
function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    stdio: options.quiet ? 'pipe' : 'inherit',
    shell: isWindows,
    env: { ...process.env, ...options.env },
    encoding: 'utf8',
  });
  const out = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  if (result.error) return { code: 1, out: `${out}
${result.error.message}` };
  return { code: result.status ?? 1, out };
}

/** Sobe um processo de longa duracao e guarda para o encerramento. */
function start(name, command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: options.cwd ?? root,
    stdio: options.pipe ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    shell: isWindows,
    env: { ...process.env, ...options.env },
  });
  children.push({ name, child });
  rememberPids();

  if (options.pipe) {
    const prefix = `${color.dim}[${name}]${color.reset} `;
    child.stdout?.on('data', (data) => {
      if (options.verbose) process.stdout.write(prefix + data.toString());
    });
    child.stderr?.on('data', (data) => {
      const text = data.toString();
      // Erros do processo filho sempre aparecem, mesmo em modo silencioso.
      if (/error|Error|EADDRINUSE/.test(text)) process.stderr.write(prefix + text);
    });
  }

  child.on('exit', (code) => {
    if (!shuttingDown && code !== 0 && code !== null) {
      fail(`${name} encerrou com codigo ${code}`);
    }
  });

  return child;
}

function tryHost(host, port, timeout) {
  return new Promise((resolve) => {
    const socket = createConnection({ port, host });
    const done = (value) => {
      socket.destroy();
      resolve(value);
    };
    socket.setTimeout(timeout);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
  });
}

/** O Vite escuta so em ::1 no Windows, entao IPv4 sozinho nao serve como sinal. */
async function portOpen(port, timeout = 900) {
  if (await tryHost('127.0.0.1', port, timeout)) return true;
  return tryHost('::1', port, timeout);
}

async function waitFor(label, check, { attempts = 240, interval = 500 } = {}) {
  for (let i = 0; i < attempts; i += 1) {
    if (await check()) return true;
    await new Promise((r) => setTimeout(r, interval));
  }
  fail(`Tempo esgotado esperando ${label}.`);
  return false;
}

async function httpOk(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch {
    return false;
  }
}

function openBrowser(url) {
  try {
    if (isWindows) spawn('cmd', ['/c', 'start', '""', url], { detached: true, stdio: 'ignore' }).unref();
    else if (process.platform === 'darwin') spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
    else spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
  } catch {
    warn(`Abra manualmente: ${url}`);
  }
}

function portFromUrl(url) {
  const match = /:(\d+)\//.exec(url);
  return match ? Number(match[1]) : 5432;
}

// ---------------------------------------------------------------------------

function ensureDependencies() {
  if (existsSync(path.join(root, 'node_modules', '@prisma', 'client'))) return true;
  step('Instalando dependencias (so na primeira vez, pode demorar alguns minutos)...');
  const { code } = run(bin('npm'), ['install', '--no-audit', '--no-fund']);
  if (code !== 0) {
    fail('A instalacao de dependencias falhou.');
    return false;
  }
  ok('Dependencias instaladas.');
  return true;
}

function ensureEnv() {
  const envPath = path.join(apiDir, '.env');
  if (!existsSync(envPath)) {
    copyFileSync(path.join(root, '.env.example'), envPath);
    ok('Arquivo apps/api/.env criado a partir do exemplo.');
  }
  const content = readFileSync(envPath, 'utf8');
  const match = /^DATABASE_URL="?([^"\n\r]+)"?/m.exec(content);
  return match ? match[1] : null;
}

/** Tenta o Docker sem travar: se o engine nao responder rapido, seguimos adiante. */
function tryDocker() {
  const probe = spawnSync('docker', ['info', '--format', '{{.ServerVersion}}'], {
    cwd: root,
    stdio: 'pipe',
    shell: isWindows,
    timeout: 6000,
    encoding: 'utf8',
  });
  if (probe.status !== 0 || probe.error) return false;

  step('Subindo o PostgreSQL via Docker...');
  const up = spawnSync('docker', ['compose', 'up', '-d'], {
    cwd: root,
    stdio: 'pipe',
    shell: isWindows,
    timeout: 90_000,
    encoding: 'utf8',
  });
  return up.status === 0;
}

async function resolveDatabase(envUrl) {
  const envPort = envUrl ? portFromUrl(envUrl) : 5432;

  if (envUrl && (await portOpen(envPort))) {
    ok(`PostgreSQL encontrado na porta ${envPort}.`);
    return { url: envUrl, kind: 'externo' };
  }

  if (tryDocker()) {
    const up = await waitFor('o PostgreSQL do Docker', () => portOpen(envPort), { attempts: 40 });
    if (up) {
      ok('PostgreSQL do Docker no ar.');
      return { url: envUrl, kind: 'docker' };
    }
  } else {
    warn('Docker indisponivel — usando o PostgreSQL embutido.');
  }

  step('Levantando o PostgreSQL embutido (nao precisa instalar nada)...');
  start('db', 'node', ['scripts/dev-db.mjs'], { cwd: apiDir, pipe: true });
  const up = await waitFor('o PostgreSQL embutido', () => portOpen(EMBEDDED_DB_PORT), { attempts: 60 });
  if (!up) return null;
  ok('PostgreSQL embutido no ar.');
  return { url: EMBEDDED_DB_URL, kind: 'embutido' };
}

function prepareDatabase(databaseUrl) {
  const env = { DATABASE_URL: databaseUrl };

  if (!existsSync(path.join(root, 'node_modules', '.prisma', 'client', 'index.js'))) {
    step('Gerando o Prisma Client...');
    run(bin('npx'), ['prisma', 'generate'], { cwd: apiDir, env, quiet: true });
  }

  const status = run('node', ['scripts/db-status.mjs'], { cwd: apiDir, env, quiet: true }).out.trim();

  if (status.includes('ready')) {
    ok('Banco pronto e com dados.');
    return true;
  }

  step('Preparando o banco (schema + dados de demonstracao)...');
  const push = run(bin('npx'), ['prisma', 'db', 'push', '--skip-generate'], { cwd: apiDir, env, quiet: true });
  if (push.code !== 0) {
    fail('Nao foi possivel aplicar o schema.');
    log(push.out.split('\n').slice(-12).join('\n'));
    return false;
  }

  const seed = run(bin('npx'), ['tsx', 'prisma/seed.ts'], { cwd: apiDir, env, quiet: true });
  if (seed.code !== 0) {
    fail('Nao foi possivel semear os dados.');
    log(seed.out.split('\n').slice(-12).join('\n'));
    return false;
  }
  ok('Banco preparado com 28 livros, 12 pessoas e 6 comunidades.');
  return true;
}

// ---------------------------------------------------------------------------

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  log('');
  step('Encerrando...');

  // No Windows, matar o processo nao mata a arvore de filhos do shell.
  for (const { child } of children) if (child.pid) killTree(child.pid);
  try {
    rmSync(pidFile, { force: true });
  } catch {
    /* sem problema */
  }
  log(`  ${color.dim}Ate a proxima leitura.${color.reset}`);
  log('');
  process.exit(exitCode);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

async function main() {
  banner();

  cleanupPreviousRun();

  const verbose = process.argv.includes('--verbose');

  if (await httpOk(`http://localhost:${WEB_PORT}/`)) {
    warn(`Ja existe algo na porta ${WEB_PORT}. Abrindo o navegador nela.`);
    openBrowser(`http://localhost:${WEB_PORT}`);
    return;
  }

  if (!ensureDependencies()) return shutdown(1);

  const envUrl = ensureEnv();
  const database = await resolveDatabase(envUrl);
  if (!database) {
    fail('Nao foi possivel preparar um banco de dados.');
    return shutdown(1);
  }

  if (!prepareDatabase(database.url)) return shutdown(1);

  step('Subindo a API...');
  start('api', bin('npx'), ['tsx', 'watch', 'src/main.ts'], {
    cwd: apiDir,
    pipe: true,
    verbose,
    env: { DATABASE_URL: database.url },
  });
  if (!(await waitFor('a API', () => httpOk(`http://localhost:${API_PORT}/api/health`)))) return shutdown(1);
  ok(`API no ar em http://localhost:${API_PORT}/api`);

  step('Subindo o app web...');
  start('web', bin('npx'), ['vite', '--port', String(WEB_PORT), '--strictPort'], {
    cwd: webDir,
    pipe: true,
    verbose,
  });
  if (!(await waitFor('o app web', () => httpOk(`http://localhost:${WEB_PORT}/`)))) return shutdown(1);
  ok(`Web no ar em http://localhost:${WEB_PORT}`);

  log('');
  log(`  ${color.bold}O RetroBook esta pronto.${color.reset}`);
  log(`  ${color.wine}http://localhost:${WEB_PORT}${color.reset}`);
  log('');
  log(`  ${color.dim}Conta de demonstracao${color.reset}`);
  log(`    e-mail  ${color.bold}guilherme@retrobook.app${color.reset}`);
  log(`    senha   ${color.bold}retrobook123${color.reset}`);
  log('');
  log(`  ${color.dim}Banco: ${database.kind}${color.reset}`);
  log(`  ${color.dim}Pressione Ctrl+C para encerrar tudo.${color.reset}`);
  log('');

  openBrowser(`http://localhost:${WEB_PORT}`);
}

main().catch((error) => {
  fail(String(error?.message ?? error));
  shutdown();
});
