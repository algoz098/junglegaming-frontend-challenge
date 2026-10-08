import * as React from 'react';
import { cn } from '@/lib/utils';

type SkeletonProps = React.HTMLAttributes<HTMLDivElement> & {
  rounded?: 'sm' | 'md' | 'lg' | 'full';
};

export function Skeleton({ className, rounded = 'md', ...props }: SkeletonProps) {
  const radius = {
    sm: 'rounded',
    lg: 'rounded-xl',
    md: 'rounded-md',
    full: 'rounded-full',
  }[rounded];
  return <div role="status" aria-busy="true" className={cn('skeleton', radius, className)} {...props} />;
}