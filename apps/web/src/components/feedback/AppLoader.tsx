import { LogoMark } from '@/components/brand/Logo';

/** Carregamento inicial da aplicacao — calmo, sem spinner agressivo. */
export function AppLoader({ label = 'Abrindo sua biblioteca...' }: { label?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-canvas rb-paper" role="status">
      <LogoMark className="h-12 w-12 animate-pulse" />
      <p className="font-display text-sm text-muted">{label}</p>
    </div>
  );
}
