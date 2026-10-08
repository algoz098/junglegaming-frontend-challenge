import { createFileRoute, redirect } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { useDeleteWallet, useUpsertWallet, useWalletProviders, useWallets } from '@/hooks/use-wallets';
import type { Wallet, WalletNetwork, WalletProvider, WalletUpsertPayload } from '@/types';
import { NETWORK_LABELS } from '@/api/search-params';
import { getSessionToken, isApiError } from '@/api/client';

export const Route = createFileRoute('/wallets')({
  beforeLoad: ({ location }) => {
    if (!getSessionToken()) {
      throw redirect({
        to: '/login',
        search: { redirect: location.pathname },
      });
    }
  },
  component: WalletsPage,
});

const EMPTY: WalletUpsertPayload = {
  label: 'Carteira principal',
  nickname: '',
  address: '',
  network: 'ethereum',
  type: 'metamask',
};

function WalletsPage() {
  const { isAuthenticated } = useAuth();
  const wallets = useWallets();
  const providers = useWalletProviders();
  const upsert = useUpsertWallet();
  const remove = useDeleteWallet();
  const [primaryFormErrors, setPrimaryFormErrors] = useState<Record<string, string>>({});
  const [secondaryFormErrors, setSecondaryFormErrors] = useState<Record<string, string>>({});

  if (!isAuthenticated) {
    return (
      <section className="container py-10">
        <div className="card-surface p-8 text-center">Carregando carteiras…</div>
      </section>
    );
  }

  const primary = (wallets.data ?? []).find((w) => w.isPrimary);
  const secondary = (wallets.data ?? []).find((w) => !w.isPrimary);

  const handleSubmitPrimary = (payload: WalletUpsertPayload) => {
    upsert.mutate(
      { ...payload, id: primary?.id, isPrimary: true },
      {
        onSuccess: () => toast.success('Carteira principal salva.'),
        onError: (err: unknown) => {
          if (isApiError(err) && err.fields) setPrimaryFormErrors(err.fields);
          toast.error((err as { message?: string })?.message ?? 'Falha ao salvar.');
        },
      },
    );
  };

  const handleSubmitSecondary = (payload: WalletUpsertPayload) => {
    upsert.mutate(
      { ...payload, id: secondary?.id, isPrimary: false },
      {
        onSuccess: () => toast.success('Carteira secundária salva.'),
        onError: (err: unknown) => {
          if (isApiError(err) && err.fields) setSecondaryFormErrors(err.fields);
          toast.error((err as { message?: string })?.message ?? 'Falha ao salvar.');
        },
      },
    );
  };

  return (
    <section className="container py-10">
      <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
        <SidebarNav active="wallets" />
        <div className="space-y-8">
          <WalletForm
            title="Carteira principal"
            description="Estas carteiras ficam disponíveis no pagamento e para receber NFTs comprados."
            submitLabel="Salvar carteira"
            providers={providers.data ?? []}
            initial={
              primary
                ? walletToPayload(primary)
                : { ...EMPTY, label: 'Principal' }
            }
            errors={primaryFormErrors}
            disabled={wallets.isLoading}
            onSubmit={handleSubmitPrimary}
            pending={upsert.isPending}
          />

          <WalletForm
            title="Carteira secundária"
            description="Você ainda não adicionou uma carteira secundária."
            submitLabel="Adicionar carteira secundária"
            providers={providers.data ?? []}
            initial={
              secondary
                ? walletToPayload(secondary)
                : { ...EMPTY, label: 'Secundária' }
            }
            errors={secondaryFormErrors}
            disabled={wallets.isLoading}
            onSubmit={handleSubmitSecondary}
            pending={upsert.isPending}
            onRemove={
              secondary
                ? () =>
                    remove.mutate(secondary.id, {
                      onSuccess: () => toast.success('Carteira removida.'),
                      onError: () => toast.error('Falha ao remover.'),
                    })
                : undefined
            }
            removing={remove.isPending}
          />

          <div className="card-surface p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider">Carteiras disponíveis</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Apenas leituras, usadas para informar os usuários sobre provedores suportados.
            </p>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {(providers.data ?? []).map((p) => (
                <li key={p.id} className="flex items-center justify-between rounded-md border border-border bg-card/40 p-3 text-sm">
                  <span>{p.displayName}</span>
                  <Badge variant="network">{p.network}</Badge>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

interface WalletFormProps {
  title: string;
  description: string;
  submitLabel: string;
  providers: { id: string; displayName: string; provider: WalletProvider; network: WalletNetwork | 'multi' }[];
  initial: WalletUpsertPayload;
  errors?: Record<string, string>;
  disabled?: boolean;
  pending?: boolean;
  removing?: boolean;
  onSubmit: (payload: WalletUpsertPayload) => void;
  onRemove?: () => void;
}

function WalletForm({
  title,
  description,
  submitLabel,
  providers,
  initial,
  errors = {},
  pending,
  removing,
  onSubmit,
  onRemove,
}: WalletFormProps) {
  const [form, setForm] = useState<WalletUpsertPayload>(initial);
  useEffect(() => {
    setForm(initial);
  }, [initial]);

  const set = <K extends keyof WalletUpsertPayload>(key: K, value: WalletUpsertPayload[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const invalid = (k: string) => Boolean(errors[k]);

  return (
    <form
      className="card-surface p-6"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
    >
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            disabled={removing}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm hover:bg-secondary disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" /> Remover
          </button>
        )}
      </header>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Field label="Nome de exibição" htmlFor={`display-${title}`} required error={errors.label}>
          <Input
            id={`display-${title}`}
            value={form.label}
            onChange={(e) => set('label', e.target.value)}
            required
            invalid={invalid('label')}
          />
        </Field>
        <Field label="Apelido da carteira" htmlFor={`nickname-${title}`} required error={errors.nickname}>
          <Input
            id={`nickname-${title}`}
            value={form.nickname}
            onChange={(e) => set('nickname', e.target.value)}
            required
            invalid={invalid('nickname')}
          />
        </Field>
        <Field label="Rede" htmlFor={`network-${title}`} required error={errors.network}>
          <Select value={form.network} onValueChange={(v) => set('network', v as WalletNetwork)}>
            <SelectTrigger id={`network-${title}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(NETWORK_LABELS) as WalletNetwork[]).map((n) => (
                <SelectItem key={n} value={n}>
                  {NETWORK_LABELS[n]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Tipo de carteira" htmlFor={`type-${title}`} required error={errors.type}>
          <Select
            value={form.type}
            onValueChange={(v) => set('type', v as WalletProvider)}
          >
            <SelectTrigger id={`type-${title}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {providers.map((p) => (
                <SelectItem key={p.id} value={p.provider}>
                  {p.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field
          label="Endereço da carteira"
          htmlFor={`address-${title}`}
          required
          error={errors.address}
          hint={errors.address ? undefined : 'Formato 0x… (EVM) ou equivalente'}
        >
          <Input
            id={`address-${title}`}
            value={form.address}
            onChange={(e) => set('address', e.target.value)}
            placeholder="0x..."
            required
            invalid={invalid('address')}
          />
        </Field>
        <Field label="ENS ou carteira secundária" htmlFor={`ens-${title}`} hint="Opcional">
          <Input
            id={`ens-${title}`}
            value={form.ens ?? ''}
            onChange={(e) => set('ens', e.target.value)}
          />
        </Field>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Os dados são validados antes de salvar. Você pode editar a qualquer momento.
        </p>
        <Button type="submit" disabled={pending}>
          <Plus className="h-4 w-4" />
          {pending ? 'Salvando…' : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function walletToPayload(w: Wallet): WalletUpsertPayload {
  return {
    id: w.id,
    label: w.label,
    nickname: w.label,
    address: w.address,
    ens: w.ens,
    network: w.network,
    type: w.type,
  };
}