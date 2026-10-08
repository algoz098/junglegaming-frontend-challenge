import { cn } from '@/lib/utils';

export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'font-display text-2xl font-extrabold tracking-[0.18em] text-foreground select-none',
        className,
      )}
    >
      KURIO
    </span>
  );
}