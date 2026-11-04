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
        'cursor-pointer font-bold transition-colors',
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

export function ActionIcon({
  name,
  className = '',
}: {
  name: 'edit' | 'trash';
  className?: string;
}) {
  return name === 'edit' ? (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z" />
    </svg>
  ) : (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="m19 6-1 14H6L5 6" />
      <path d="M10 11v5M14 11v5" />
    </svg>
  );
}

export function SelectChevron() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      className="select-chevron"
    >
      <path
        d="m5.5 7.5 4.5 4.5 4.5-4.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AutoGrowTextarea({
  className = '',
  onInput,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      onInput={(event) => {
        const textarea = event.currentTarget;
        textarea.style.height = 'auto';
        textarea.style.height = `${Math.min(textarea.scrollHeight, 192)}px`;
        textarea.style.overflowY =
          textarea.scrollHeight > 192 ? 'auto' : 'hidden';
        onInput?.(event);
      }}
      className={[
        'min-h-12 w-full rounded-xl border border-line bg-surface px-4 py-3',
        'text-base text-ink outline-none transition-colors',
        'placeholder:text-ink-faint focus:border-brand-600',
        'focus:ring-4 focus:ring-brand-100',
        'resize-none overflow-y-hidden',
        className,
      ].join(' ')}
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
          'h-12 w-full rounded-xl border bg-surface px-4',
          'text-base text-ink outline-none transition-colors',
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
