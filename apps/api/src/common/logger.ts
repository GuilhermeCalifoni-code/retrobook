import { env } from '../config/env';

/**
 * Log estruturado (secao 43).
 *
 * Em desenvolvimento sai legivel para humanos; em producao sai como JSON por
 * linha, que e o formato que qualquer coletor (Datadog, Loki, CloudWatch)
 * entende sem parser customizado.
 *
 * Regra inegociavel: nada de senha, token, cookie ou header de autorizacao.
 * A funcao `redact` remove esses campos antes de qualquer escrita.
 */

type Level = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const MIN_LEVEL: Level = env.isProd ? 'info' : 'debug';

const SENSITIVE_KEYS = new Set([
  'password',
  'passwordhash',
  'currentpassword',
  'token',
  'tokenhash',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'cookie',
  'secret',
  'apikey',
]);

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 4 || value == null) return value;
  if (Array.isArray(value)) return value.slice(0, 20).map((item) => redact(item, depth + 1));
  if (typeof value !== 'object') return value;

  const out: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
    out[key] = SENSITIVE_KEYS.has(key.toLowerCase()) ? '[redigido]' : redact(raw, depth + 1);
  }
  return out;
}

const ESC = String.fromCharCode(27);
const COLORS: Record<Level, string> = {
  debug: ESC + '[2m',
  info: ESC + '[36m',
  warn: ESC + '[33m',
  error: ESC + '[31m',
};
const RESET = ESC + '[0m';

function write(level: Level, message: string, context?: Record<string, unknown>) {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[MIN_LEVEL]) return;

  const safeContext = context ? (redact(context) as Record<string, unknown>) : undefined;

  if (env.isProd) {
    process.stdout.write(
      `${JSON.stringify({ level, time: new Date().toISOString(), message, ...safeContext })}\n`,
    );
    return;
  }

  const detail = safeContext && Object.keys(safeContext).length ? ` ${JSON.stringify(safeContext)}` : '';
  console.log(`${COLORS[level]}[${level}]${RESET} ${message}${detail}`);
}

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => write('debug', message, context),
  info: (message: string, context?: Record<string, unknown>) => write('info', message, context),
  warn: (message: string, context?: Record<string, unknown>) => write('warn', message, context),
  error: (message: string, error?: unknown, context?: Record<string, unknown>) =>
    write('error', message, {
      ...context,
      ...(error instanceof Error
        ? { errorName: error.name, errorMessage: error.message, stack: error.stack?.split('\n').slice(0, 5) }
        : error != null
          ? { error: String(error) }
          : {}),
    }),
  /** Cria um logger com contexto fixo (ex.: requestId), sem repetir em cada chamada. */
  child(base: Record<string, unknown>) {
    return {
      debug: (m: string, c?: Record<string, unknown>) => write('debug', m, { ...base, ...c }),
      info: (m: string, c?: Record<string, unknown>) => write('info', m, { ...base, ...c }),
      warn: (m: string, c?: Record<string, unknown>) => write('warn', m, { ...base, ...c }),
      error: (m: string, e?: unknown, c?: Record<string, unknown>) => logger.error(m, e, { ...base, ...c }),
    };
  },
};

export type Logger = typeof logger;
