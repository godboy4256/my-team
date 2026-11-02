import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'quiet';
  size?: 'sm' | 'md' | 'lg';
};

const buttonVariants = {
  primary:
    'bg-brand-700 text-white shadow-sm hover:bg-brand-800 focus-visible:ring-brand-500',
  secondary:
    'border border-line bg-surface text-ink hover:bg-surface-subtle focus-visible:ring-brand-500',
  quiet:
    'bg-transparent text-ink-muted hover:bg-surface-subtle focus-visible:ring-brand-500',
};

const buttonSizes = {
  sm: 'min-h-10 px-3.5 text-sm',
  md: 'min-h-12 px-5 text-base',
  lg: 'min-h-14 px-6 text-lg',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-xl',
        'font-bold transition-colors',
        'focus-visible:outline-none focus-visible:ring-2',
        'focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        buttonVariants[variant],
        buttonSizes[size],
        className,
      ].join(' ')}
      {...props}
    />
  );
}

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
};

export function TextInput({
  label,
  hint,
  error,
  id,
  className = '',
  ...props
}: TextInputProps) {
  const inputId = id ?? props.name ?? label.replaceAll(' ', '-');
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;

  return (
    <div className="grid gap-2">
      <label htmlFor={inputId} className="text-sm font-bold text-ink">
        {label}
      </label>
      <input
        id={inputId}
        className={[
          'min-h-12 w-full rounded-xl border bg-surface px-4',
          'text-base text-ink outline-none transition',
          'placeholder:text-ink-faint focus:border-brand-600',
          'focus:ring-4 focus:ring-brand-100',
          error ? 'border-danger' : 'border-line',
          className,
        ].join(' ')}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        {...props}
      />
      {error ? (
        <p id={errorId} className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="text-sm text-ink-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function PageContainer({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        'mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}

export function Centered({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        'flex min-h-full items-center justify-center',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}

export function Card({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6 ${className}`}
    >
      {children}
    </section>
  );
}
