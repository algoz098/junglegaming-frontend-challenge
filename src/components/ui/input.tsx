import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  invalid?: boolean;
  prefix?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', invalid, prefix, ...props }, ref) => {
    if (prefix) {
      return (
        <div
          className={cn(
            'flex h-11 w-full items-center rounded-md border border-input bg-transparent transition-colors',
            'focus-within:border-primary focus-within:ring-1 focus-within:ring-primary',
            invalid && 'border-destructive focus-within:border-destructive',
            className,
          )}
        >
          <span className="pl-3 text-sm text-muted-foreground">{prefix}</span>
          <input
            ref={ref}
            type={type}
            className="h-full w-full bg-transparent px-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed"
            {...props}
          />
        </div>
      );
    }
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          'flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors',
          'focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary',
          'disabled:cursor-not-allowed disabled:opacity-50',
          invalid && 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive',
          className,
        )}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export interface FieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}

export function Field({ label, htmlFor, error, required, hint, children, className }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-foreground/80">
        {label}
        {required && <span className="ml-1 text-primary">*</span>}
      </label>
      {children}
      {hint && !error && <span className="text-xs text-muted-foreground">{hint}</span>}
      {error && (
        <span role="alert" className="text-xs text-destructive">
          {error}
        </span>
      )}
    </div>
  );
}