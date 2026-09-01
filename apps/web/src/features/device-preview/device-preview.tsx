import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type DeviceMode = 'desktop' | 'tablet' | 'mobile';
/** Modo estrutural efetivo: o que a interface deve realmente desenhar. */
export type LayoutMode = DeviceMode;

interface DevicePreviewValue {
  /** Escolha manual do preview. `auto` = segue o viewport real. */
  preview: DeviceMode | 'auto';
  setPreview: (mode: DeviceMode | 'auto') => void;
  /** Modo efetivo, ja resolvido. Componentes estruturais leem daqui. */
  layout: LayoutMode;
  /** Verdadeiro quando estamos dentro do mockup de aparelho. */
  isFramed: boolean;
}

const DevicePreviewContext = createContext<DevicePreviewValue | null>(null);

const STORAGE_KEY = 'retrobook.preview';

/**
 * O preview roda o app dentro de um iframe com largura de aparelho, para que
 * as media queries meçam a largura real do "celular" e nao a da janela.
 * Este parametro marca a instancia de dentro, que nunca deve emoldurar de novo.
 */
export const PREVIEW_PARAM = 'rb-preview';

export function isInsidePreviewFrame() {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).has(PREVIEW_PARAM);
}

function viewportMode(width: number): LayoutMode {
  if (width < 768) return 'mobile';
  if (width < 1180) return 'tablet';
  return 'desktop';
}

export function DevicePreviewProvider({ children }: { children: ReactNode }) {
  const insideFrame = isInsidePreviewFrame();

  const [preview, setPreviewState] = useState<DeviceMode | 'auto'>(() => {
    if (typeof window === 'undefined' || insideFrame) return 'auto';
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === 'mobile' || stored === 'tablet' || stored === 'desktop' ? stored : 'auto';
  });

  const [viewport, setViewport] = useState<LayoutMode>(() =>
    typeof window === 'undefined' ? 'desktop' : viewportMode(window.innerWidth),
  );

  useEffect(() => {
    const onResize = () => setViewport(viewportMode(window.innerWidth));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const setPreview = useCallback((mode: DeviceMode | 'auto') => {
    setPreviewState(mode);
    window.localStorage.setItem(STORAGE_KEY, mode);
  }, []);

  const value = useMemo<DevicePreviewValue>(() => {
    // Dentro do iframe o app e "o aparelho": segue a propria viewport, sempre.
    // Fora dele, o preview so simula telas menores — nao faz sentido "aumentar"
    // a janela real.
    const framed = !insideFrame && preview !== 'auto' && preview !== 'desktop' && viewport === 'desktop';
    return {
      preview: insideFrame ? 'auto' : preview,
      setPreview,
      layout: viewport,
      isFramed: framed,
    };
  }, [insideFrame, preview, setPreview, viewport]);

  return <DevicePreviewContext.Provider value={value}>{children}</DevicePreviewContext.Provider>;
}

export function useDevicePreview() {
  const context = useContext(DevicePreviewContext);
  if (!context) throw new Error('useDevicePreview precisa estar dentro de DevicePreviewProvider');
  return context;
}

/** Atalho usado por componentes que so precisam saber o formato da tela. */
export function useLayoutMode(): LayoutMode {
  return useDevicePreview().layout;
}
