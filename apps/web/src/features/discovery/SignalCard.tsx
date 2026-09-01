import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, MessageCircle, Sparkles, Users } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { HomeSignal, SignalKind } from '@/types/api';

/**
 * Sinais da Home (secao 3).
 *
 * Cada card responde "o que mudou desde a ultima vez que eu vim?". O texto ja
 * chega pronto do backend — aqui cuidamos apenas da leitura visual: o primeiro
 * sinal ganha destaque, os demais viram uma fileira secundaria.
 */

const STYLE: Record<SignalKind, { icon: React.ReactNode; accent: string; ring: string }> = {
  companions: { icon: <Users className="h-4 w-4" />, accent: 'text-burgundy', ring: 'border-burgundy/25 bg-burgundy/[0.05]' },
  conversation: { icon: <MessageCircle className="h-4 w-4" />, accent: 'text-gold', ring: 'border-gold/30 bg-gold/[0.06]' },
  community: { icon: <Users className="h-4 w-4" />, accent: 'text-gold', ring: 'border-line bg-surface' },
  match: { icon: <Sparkles className="h-4 w-4" />, accent: 'text-burgundy', ring: 'border-burgundy/25 bg-burgundy/[0.05]' },
  recommendation: { icon: <BookOpen className="h-4 w-4" />, accent: 'text-muted', ring: 'border-line bg-surface' },
  welcome: { icon: <Sparkles className="h-4 w-4" />, accent: 'text-gold', ring: 'border-gold/30 bg-gold/[0.06]' },
};

export function SignalCard({ signal, featured }: { signal: HomeSignal; featured?: boolean }) {
  const style = STYLE[signal.kind];

  return (
    <Link
      to={signal.href}
      className={cn(
        'group flex items-start gap-3 rounded-card border p-4 transition-all duration-200 ease-editorial hover:-translate-y-0.5 hover:shadow-paper',
        style.ring,
        featured && 'sm:p-5',
      )}
    >
      <span
        className={cn(
          'flex shrink-0 items-center justify-center rounded-panel bg-surface shadow-paper',
          style.accent,
          featured ? 'h-10 w-10' : 'h-8 w-8',
        )}
        aria-hidden
      >
        {style.icon}
      </span>

      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block font-display font-semibold leading-snug text-ink text-pretty',
            featured ? 'text-lg sm:text-xl' : 'text-sm',
          )}
        >
          {signal.title}
        </span>
        {signal.detail && (
          <span className={cn('mt-1 block text-muted text-pretty', featured ? 'text-sm' : 'text-xs')}>
            {signal.detail}
          </span>
        )}
        <span className={cn('mt-2 inline-flex items-center gap-1 text-sm font-medium', style.accent)}>
          {signal.cta}
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </span>
      </span>
    </Link>
  );
}

/** Bloco de sinais: um destaque e os demais em grade. */
export function SignalDeck({ signals }: { signals: HomeSignal[] }) {
  if (signals.length === 0) return null;
  const [first, ...rest] = signals;

  return (
    <section aria-label="O que mudou" className="space-y-3">
      <SignalCard signal={first!} featured />
      {/*
        Duas colunas, nao tres: com sidebar e trilho lateral, o espaco central
        nao comporta tres cards sem espremer o texto a ponto de quebrar palavra.
      */}
      {rest.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {rest.slice(0, 2).map((signal) => (
            <SignalCard key={`${signal.kind}-${signal.title}`} signal={signal} />
          ))}
        </div>
      )}
    </section>
  );
}
