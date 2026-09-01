import { useEffect, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { Monitor, RotateCw, Smartphone, Tablet } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Logo } from '@/components/brand/Logo';
import { PREVIEW_PARAM, useDevicePreview, type DeviceMode } from './device-preview';

const OPTIONS: { mode: DeviceMode | 'auto'; label: string; icon: ReactNode; hint: string }[] = [
  { mode: 'auto', label: 'Automatico', icon: <Monitor className="h-4 w-4" />, hint: 'Segue a janela real' },
  { mode: 'tablet', label: 'Tablet', icon: <Tablet className="h-4 w-4" />, hint: '834 x 1112' },
  { mode: 'mobile', label: 'Mobile', icon: <Smartphone className="h-4 w-4" />, hint: '390 x 844' },
];

/**
 * Alternador de Mobile Preview (secao 7).
 * Nao e um zoom: o app roda dentro de um iframe com a largura do aparelho,
 * entao as media queries e a navegacao inferior se comportam como no celular.
 */
export function DevicePreviewSwitcher({ className }: { className?: string }) {
  const { preview, setPreview } = useDevicePreview();

  return (
    <div
      className={cn('inline-flex items-center gap-0.5 rounded-pill border border-line bg-surface p-0.5', className)}
      role="radiogroup"
      aria-label="Visualizar como"
    >
      {OPTIONS.map((option) => {
        const active = preview === option.mode;
        return (
          <button
            key={option.mode}
            type="button"
            role="radio"
            aria-checked={active}
            title={`${option.label} — ${option.hint}`}
            onClick={() => setPreview(option.mode)}
            className={cn(
              'inline-flex h-8 items-center gap-1.5 rounded-pill px-2.5 text-xs font-medium transition-colors',
              active ? 'bg-action text-on-brand' : 'text-muted hover:bg-raised hover:text-ink',
            )}
          >
            {option.icon}
            <span className="hidden lg:inline">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

const FRAME_SIZES: Record<Exclude<DeviceMode, 'desktop'>, { w: number; h: number; radius: number }> = {
  mobile: { w: 390, h: 844, radius: 44 },
  tablet: { w: 834, h: 1112, radius: 28 },
};

/**
 * Mockup de aparelho. O conteudo real vem de um iframe apontando para a mesma
 * rota — mesma origem, entao a sessao (cookies httpOnly) continua valendo.
 */
export function DeviceFrame({ children }: { children: ReactNode }) {
  const { isFramed, preview } = useDevicePreview();
  const location = useLocation();
  const [reloadKey, setReloadKey] = useState(0);
  const [available, setAvailable] = useState({ w: 1200, h: 800 });

  useEffect(() => {
    const measure = () => setAvailable({ w: window.innerWidth, h: window.innerHeight });
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  if (!isFramed || preview === 'auto' || preview === 'desktop') return <>{children}</>;

  const size = FRAME_SIZES[preview];
  // O aparelho encolhe proporcionalmente quando a janela nao comporta o tamanho real.
  const scale = Math.min(1, (available.h - 150) / (size.h + 24), (available.w - 80) / (size.w + 24));

  const src = `${location.pathname}?${PREVIEW_PARAM}=1`;

  return (
    <div className="flex min-h-dvh flex-col bg-[rgb(var(--rb-raised))] rb-paper">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-canvas/80 px-5 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <Logo compact />
          <div>
            <p className="text-sm font-medium text-ink">Mobile Preview</p>
            <p className="text-xs text-muted">
              {preview === 'mobile' ? 'iPhone 390 x 844' : 'Tablet 834 x 1112'}
              {scale < 1 && ` — exibido a ${Math.round(scale * 100)}%`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            aria-label="Recarregar o preview"
            className="rounded-full p-2 text-muted transition-colors hover:bg-raised hover:text-ink"
          >
            <RotateCw className="h-4 w-4" aria-hidden />
          </button>
          <DevicePreviewSwitcher />
        </div>
      </header>

      <div className="flex flex-1 items-start justify-center overflow-auto p-6">
        <div style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}>
          <div
            className="relative border-[11px] border-device bg-canvas shadow-device"
            style={{ width: size.w, height: size.h, borderRadius: size.radius }}
          >
            {preview === 'mobile' && (
              <div
                aria-hidden
                className="absolute left-1/2 top-1.5 z-10 h-6 w-28 -translate-x-1/2 rounded-full bg-device"
              />
            )}
            <iframe
              key={`${preview}-${reloadKey}`}
              src={src}
              title={`RetroBook em ${preview === 'mobile' ? 'celular' : 'tablet'}`}
              className="h-full w-full border-0 bg-canvas"
              style={{ borderRadius: size.radius - 11 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
