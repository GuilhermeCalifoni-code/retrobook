import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button, Card } from '@/design-system';

/**
 * Convite de upgrade (secao 30).
 *
 * A regra aqui e de tom, nao de codigo: o limite do plano gratuito nunca deve
 * soar como parede. Ele aparece quando a comunidade **cresceu** — ou seja,
 * quando a pessoa ja teve valor — e o texto celebra isso antes de propor.
 *
 *   Ruim:  "Limite atingido."
 *   Certo: "Sua comunidade esta crescendo."
 */
export function UpgradePrompt({
  title,
  description,
  cta = 'Conhecer o RetroBook Pro',
  variant = 'card',
  className,
}: {
  title: string;
  description: string;
  cta?: string;
  variant?: 'card' | 'inline';
  className?: string;
}) {
  if (variant === 'inline') {
    return (
      <div
        className={cn(
          'flex flex-wrap items-center gap-3 rounded-panel border border-gold/30 bg-gold/[0.07] p-3.5',
          className,
        )}
      >
        <TrendingUp className="h-4 w-4 shrink-0 text-gold" aria-hidden />
        <p className="min-w-0 flex-1 text-sm text-muted">
          <span className="font-medium text-ink">{title}</span> {description}
        </p>
        <Link to="/configuracoes?aba=plano" className="shrink-0">
          <Button size="sm" variant="gold">
            {cta}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <Card className={cn('border-gold/35 bg-gold/[0.06]', className)}>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-panel bg-gold/15 text-gold">
          <Sparkles className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h3 className="font-display text-base font-semibold text-ink">{title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-muted text-pretty">{description}</p>
          <Link to="/configuracoes?aba=plano" className="mt-3 inline-block">
            <Button size="sm" variant="gold" rightIcon={<ArrowRight className="h-3.5 w-3.5" />}>
              {cta}
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}

/**
 * Mensagens de limite, em um lugar so — para que o tom nao varie de tela
 * para tela conforme quem escreveu.
 */
export const UPGRADE_COPY = {
  communityMembers: (name: string, limit: number) => ({
    title: `${name} esta crescendo.`,
    description: `Voce chegou aos ${limit} membros do plano gratuito. O Pro libera o crescimento e traz moderacao avancada e analytics.`,
  }),
  communityCount: {
    title: 'Voce ja tem uma comunidade no ar.',
    description:
      'O plano gratuito acompanha a primeira. Quando quiser cuidar de mais espacos, o Pro permite ate 10 comunidades.',
  },
  privateCommunity: {
    title: 'Comunidades privadas sao do Pro.',
    description: 'Grupos fechados, entrada por convite e conteudo visivel so para membros.',
  },
  analytics: {
    title: 'Entenda sua comunidade.',
    description: 'O Pro mostra crescimento, participacao e quem mais movimenta as discussoes.',
  },
} as const;
