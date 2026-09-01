import { formatDistanceToNowStrict, format, isThisYear, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

function toDate(value: string | Date) {
  return typeof value === 'string' ? parseISO(value) : value;
}

/** "ha 3 horas", "ha 2 dias" — sempre em portugues e sem sufixo redundante. */
export function formatRelative(value: string | Date) {
  const date = toDate(value);
  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return 'agora';
  if (diff > 7 * 24 * 60 * 60 * 1000) return formatDate(date);
  return `ha ${formatDistanceToNowStrict(date, { locale: ptBR })}`;
}

export function formatDate(value: string | Date) {
  const date = toDate(value);
  return format(date, isThisYear(date) ? "d 'de' MMM" : "d 'de' MMM 'de' yyyy", { locale: ptBR });
}

export function formatFullDate(value: string | Date) {
  return format(toDate(value), "d 'de' MMMM 'de' yyyy", { locale: ptBR });
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat('pt-BR').format(value);
}

export function formatCurrency(cents: number, currency = 'BRL') {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency }).format(cents / 100);
}

/** Saudacao da Home, sensivel a hora do dia. */
export function greeting(name: string) {
  const hour = new Date().getHours();
  const period = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  return `${period}, ${name.split(' ')[0]}.`;
}

export function pluralize(count: number, one: string, many: string) {
  return `${formatNumber(count)} ${count === 1 ? one : many}`;
}
