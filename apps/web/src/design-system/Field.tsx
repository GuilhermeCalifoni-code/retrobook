import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

const controlBase =
  'w-full rounded-panel border bg-surface px-3.5 text-sm text-ink placeholder:text-subtle transition-colors ' +
  'border-line hover:border-subtle focus:border-burgundy focus:outline-none focus:ring-2 focus:ring-burgundy/25 ' +
  'disabled:cursor-not-allowed disabled:opacity-60';

interface FieldShellProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  htmlFor: string;
  children: ReactNode;
  className?: string;
}

/** Casca comum: label, dica e mensagem de erro ligadas por aria. */
function FieldShell({ label, hint, error, required, htmlFor, children, className }: FieldShellProps) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label htmlFor={htmlFor} className="block text-sm font-medium text-ink">
          {label}
          {required && <span className="ml-0.5 text-burgundy">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="flex items-start gap-1.5 text-xs text-danger">
          <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightSlot?: ReactNode;
  containerClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, leftIcon, rightSlot, className, containerClassName, id, required, ...props },
  ref,
) {
  const generated = useId();
  const inputId = id ?? generated;

  return (
    <FieldShell
      label={label}
      hint={hint}
      error={error}
      required={required}
      htmlFor={inputId}
      className={containerClassName}
    >
      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle" aria-hidden>
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          id={inputId}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={cn(
            controlBase,
            'h-11',
            leftIcon && 'pl-10',
            rightSlot && 'pr-11',
            error && 'border-danger focus:border-danger focus:ring-danger/25',
            className,
          )}
          {...props}
        />
        {rightSlot && <span className="absolute right-2 top-1/2 -translate-y-1/2">{rightSlot}</span>}
      </div>
    </FieldShell>
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
  counterMax?: number;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, counterMax, className, id, required, value, ...props },
  ref,
) {
  const generated = useId();
  const inputId = id ?? generated;
  const length = typeof value === 'string' ? value.length : 0;

  return (
    <FieldShell label={label} hint={hint} error={error} required={required} htmlFor={inputId}>
      <div className="relative">
        <textarea
          ref={ref}
          id={inputId}
          required={required}
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={cn(
            controlBase,
            'min-h-[7rem] resize-y py-3 leading-relaxed',
            error && 'border-danger focus:border-danger focus:ring-danger/25',
            className,
          )}
          maxLength={counterMax}
          {...props}
        />
        {counterMax && (
          <span
            className={cn(
              'pointer-events-none absolute bottom-2.5 right-3 font-mono text-label',
              length > counterMax * 0.9 ? 'text-burgundy' : 'text-subtle',
            )}
          >
            {length}/{counterMax}
          </span>
        )}
      </div>
    </FieldShell>
  );
});

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, className, id, required, children, ...props },
  ref,
) {
  const generated = useId();
  const inputId = id ?? generated;

  return (
    <FieldShell label={label} hint={hint} error={error} required={required} htmlFor={inputId}>
      <select
        ref={ref}
        id={inputId}
        required={required}
        aria-invalid={error ? true : undefined}
        className={cn(controlBase, 'h-11 cursor-pointer pr-9', className)}
        {...props}
      >
        {children}
      </select>
    </FieldShell>
  );
});

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}

export function Switch({ checked, onChange, label, description, disabled }: SwitchProps) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <label htmlFor={id} className="block cursor-pointer text-sm font-medium text-ink">
          {label}
        </label>
        {description && <p className="mt-0.5 text-xs leading-relaxed text-muted">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-pill border transition-colors duration-200',
          checked ? 'border-burgundy bg-burgundy' : 'border-line bg-raised',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-4.5 w-4.5 rounded-full bg-surface shadow-paper transition-transform duration-200 ease-editorial',
            'h-[18px] w-[18px]',
            checked ? 'translate-x-[22px]' : 'translate-x-[3px]',
          )}
        />
      </button>
    </div>
  );
}

export interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  id?: string;
}

export function Checkbox({ checked, onChange, label, id }: CheckboxProps) {
  const generated = useId();
  const inputId = id ?? generated;
  return (
    <div className="flex items-start gap-2.5">
      <input
        id={inputId}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-line text-burgundy accent-[rgb(var(--rb-burgundy))]"
      />
      <label htmlFor={inputId} className="cursor-pointer text-sm leading-relaxed text-muted">
        {label}
      </label>
    </div>
  );
}
