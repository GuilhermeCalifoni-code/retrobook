import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '@/lib/cn';

type ToastTone = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  tone: ToastTone;
  message: string;
  action?: { label: string; onClick: () => void };
}

interface ToastApi {
  toast: (message: string, options?: { tone?: ToastTone; action?: Toast['action'] }) => void;
  success: (message: string) => void;
  error: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const icons: Record<ToastTone, ReactNode> = {
  success: <CheckCircle2 className="h-4 w-4 text-success" aria-hidden />,
  error: <AlertCircle className="h-4 w-4 text-danger" aria-hidden />,
  info: <Info className="h-4 w-4 text-gold" aria-hidden />,
};

let counter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback<ToastApi['toast']>(
    (message, options) => {
      const id = ++counter;
      setToasts((prev) => [...prev.slice(-2), { id, message, tone: options?.tone ?? 'info', action: options?.action }]);
      window.setTimeout(() => dismiss(id), options?.action ? 7000 : 4200);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      toast,
      success: (message) => toast(message, { tone: 'success' }),
      error: (message) => toast(message, { tone: 'error' }),
    }),
    [toast],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <div
          // aria-live garante que o feedback chegue a leitores de tela.
          aria-live="polite"
          aria-atomic="false"
          className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--rb-bottom-nav-h)+1rem)] z-toast flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:right-6 sm:left-auto sm:items-end"
        >
          {toasts.map((item) => (
            <div
              key={item.id}
              className={cn(
                'pointer-events-auto flex w-full max-w-sm animate-fade-up items-start gap-3 rounded-panel border bg-surface px-4 py-3 shadow-lifted',
                item.tone === 'success' && 'border-success/30',
                item.tone === 'error' && 'border-danger/30',
                item.tone === 'info' && 'border-line',
              )}
            >
              <span className="mt-0.5 shrink-0">{icons[item.tone]}</span>
              <p className="flex-1 text-sm leading-relaxed text-ink">{item.message}</p>
              {item.action && (
                <button
                  type="button"
                  onClick={() => {
                    item.action!.onClick();
                    dismiss(item.id);
                  }}
                  className="shrink-0 text-sm font-medium text-burgundy hover:underline"
                >
                  {item.action.label}
                </button>
              )}
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                aria-label="Fechar aviso"
                className="-mr-1 shrink-0 rounded p-1 text-subtle transition-colors hover:text-ink"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast precisa estar dentro de ToastProvider');
  return context;
}
