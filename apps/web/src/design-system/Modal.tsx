import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  /** No mobile o dialogo sobe do rodape como bottom sheet. */
  sheetOnMobile?: boolean;
}

const sizes = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' };

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  sheetOnMobile = true,
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      // Prende o Tab dentro do dialogo (acessibilidade de teclado).
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0]!;
      const last = focusables[focusables.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    const timer = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>('[data-autofocus], button, input, textarea')?.focus();
    }, 30);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
      window.clearTimeout(timer);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-overlay flex items-end justify-center sm:items-center sm:p-4">
      <div
        className="absolute inset-0 animate-fade-in bg-[rgb(20_18_16_/_0.55)] backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          'relative z-10 flex max-h-[92dvh] w-full flex-col overflow-hidden border border-line bg-surface shadow-lifted',
          'animate-scale-in',
          sheetOnMobile ? 'rounded-t-3xl sm:rounded-card' : 'rounded-card',
          sizes[size],
        )}
      >
        {sheetOnMobile && (
          <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-line sm:hidden" aria-hidden />
        )}
        {(title || description) && (
          <header className="flex items-start justify-between gap-4 px-5 pb-3 pt-5 sm:px-6">
            <div className="min-w-0">
              {title && <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>}
              {description && <p className="mt-1 text-sm text-muted text-pretty">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="-mr-1 rounded-full p-2 text-muted transition-colors hover:bg-raised hover:text-ink"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </header>
        )}
        <div className="flex-1 overflow-y-auto px-5 pb-5 sm:px-6">{children}</div>
        {footer && (
          <footer className="flex items-center justify-end gap-2 border-t border-line bg-raised/50 px-5 py-3.5 rb-safe-bottom sm:px-6">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}
