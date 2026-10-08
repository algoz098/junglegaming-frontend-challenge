import type { QueryClient } from '@tanstack/react-query';

let client: QueryClient | null = null;

export function setQueryClient(qc: QueryClient): void {
  client = qc;
}

export function getQueryClient(): QueryClient | null {
  return client;
}
