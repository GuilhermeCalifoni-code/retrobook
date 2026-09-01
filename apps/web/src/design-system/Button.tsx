import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'gold' | 'danger';
type Size = 'sm' | 'md' | 'lg' | 'icon';

const variants: Record<Variant, string> = {
  primary: 'bg-action text-on-brand hover:bg-burgundy-deep active:bg-burgundy-deep shadow-paper',
  secondary: 'bg-raised text-ink hover:bg-line/60 border border-line',
  outline: 'border border-line bg-transparent text-ink hover:bg-raised',
  ghost: 'bg-transparent text-muted hover:bg-raised hover:text-ink',
  gold: 'bg-gold text-on-gold hover:brightness-95 shadow-paper',
  danger: 'bg-danger text-on-brand hover:brightness-95',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm gap-1.5',
  md: 'h-11 px-5 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2.5',
  icon: 'h-10 w-10 justify-center',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, leftIcon, rightIcon, fullWidth, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      // aria-busy comunica o estado de carregamento a leitores de tela.
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={cn(
        'relative inline-flex items-center rounded-pill font-medium transition-all duration-200 ease-editorial',
        'disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full justify-center',
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden /> : leftIcon}
      {children}
      {!loading && rightIcon}
    </button>
  );
});
