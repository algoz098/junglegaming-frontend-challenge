import { createFileRoute, Link, redirect, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ShieldCheck, Wallet, Plug, PlugZap, Unplug, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NftArt } from '@/components/nft/nft-art';
import { useCart } from '@/hooks/use-cart';
import { useNftList } from '@/hooks/use-nfts';
import { useWallets } from '@/hooks/use-wallets';
import { useAuth } from '@/hooks/use-auth';
import { cartApi, ordersApi } from '@/api/endpoints';
import { getSessionToken, isApiError } from '@/api/client';
import { formatEth } from '@/lib/format';
import { lineTotal } from '@/lib/line-total';
import type { CartTotals, OrderCollectorInfo, WalletNetwork, WalletProvider } from '@/types';
import { NETWORK_LABELS } from '@/api/search-params';

export const Route = createFileRoute('/checkout')({
  beforeLoad: ({ location }) => {
    if (!getSessionToken()) {
      throw redirect({
        to: '/login',
        search: { redirect: location.pathname },
      });
    }
  },
  component: CheckoutPage,
});

type WalletStatus = 'idle' | 'connecting' | 'connected' | 'rejected' | 'disconnected';

function simulateWalletConnect(): Promise<string> {
  return new Promise((resolve, reject) => {
    const fail = Math.random() < 0.18;
    setTimeout(() => {
      if (fail) {
        reject(new Error('Conexão recusada pelo usuário.'));
      } else {
        resolve(`0x${Math.random().toString(16).slice(2, 6)}${Math.random().toString(16).slice(2, 10)}`);
      }
    }, 600);
  });
}

function CheckoutPage() {
  const { user } = useAuth();
  const cart = useCart();
  const navigate = useNavigate();
  const nfts = useNftList({ pageSize: 48 });
  const nftMap = new Map((nfts.data?.data ?? []).map((n) => [n.id, n]));
  const wallets = useWallets();
  const [submitting, setSubmitting] = useState(false);
  const [walletStatus, setWalletStatus] = useState<WalletStatus>('idle');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [cartError, setCartError] = useState<string | null>(null);
  const [form, setForm] = useState<OrderCollectorInfo>({
    displayName: user?.displayName ?? '',
    username: user?.username ?? '',
    network: 'ethereum',
    walletAddress: '',
    ensName: user?.ensName ?? '',
    email: user?.email ?? '',
    note: '',
  });
  const [walletProvider, setWalletProvider] = useState<WalletProvider>('metamask');
  const [useOtherWallet, setUseOtherWallet] = useState(false);

  useEffect(() => {
    if (user && !form.displayName && !form.email) {
      setForm((f) => ({
        ...f,
        displayName: f.displayName || user.displayName,
        username: f.username || user.username,
        ensName: f.ensName || user.ensName || '',
        email: f.email || user.email,
      }));
    }
  }, [user, form.displayName, form.email, form.username, form.ensName]);

  if (!cart.data || cart.data.items.length === 0) {
    return (
      <section className="container py-16">
        <div className="card-surface mx-auto max-w-md p-10 text-center">
          <h1 className="font-display text-2xl font-bold">Sem itens no carrinho</h1>
          <p className="mt-2 text-sm text-muted-foreground">Adicione NFTs antes de finalizar a compra.</p>
          <Button asChild className="mt-6">
            <Link to="/cart">Voltar ao carrinho</Link>
          </Button>
        </div>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="container py-16">
        <div className="card-surface mx-auto max-w-md p-10 text-center">
          <h1 className="font-display text-2xl font-bold">Carregando dados do colecionador…</h1>
        </div>
      </section>
    );
  }

  const onConnectWallet = async () => {
    setWalletStatus('connecting');
    setCartError(null);
    try {
      const address = await simulateWalletConnect();
      setForm((f) => ({ ...f, walletAddress: address }));
      setWalletStatus('connected');
      toast.success(`${walletProvider} conectada.`);
    } catch (err) {
      setWalletStatus('rejected');
      toast.error((err as Error).message ?? 'Conexão recusada.');
    }
  };

  const onDisconnectWallet = () => {
    setForm((f) => ({ ...f, walletAddress: '' }));
    setWalletStatus('disconnected');
    toast.info('Carteira desconectada.');
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setCartError(null);

    const localErrors: Record<string, string> = {};
    if (!form.displayName) localErrors.displayName = 'obrigatório';
    if (!form.username) localErrors.username = 'obrigatório';
    if (!form.email) localErrors.email = 'obrigatório';
    if (!form.walletAddress) localErrors.walletAddress = 'conecte uma carteira';
    if (Object.keys(localErrors).length) {
      setFieldErrors(localErrors);
      return;
    }

    setSubmitting(true);
    try {
      const fresh: CartTotals = await cartApi.quote();
      if (fresh.version > cart.data!.totals.version) {
        setCartError(
          'Preço, disponibilidade ou cupom mudaram desde que você chegou aqui. Revise os valores e confirme novamente.',
        );
        setSubmitting(false);
        return;
      }

      const idempotencyKey = `idem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const order = await ordersApi.create({
        items: cart.data!.items.map((i) => ({ nftId: i.nftId, quantity: i.quantity })),
        couponCode: cart.data!.totals.appliedCoupon?.code,
        collector: form,
        walletProvider,
        idempotencyKey,
        expectedTotalsVersion: cart.data!.totals.version,
      });
      toast.message(`Pedido ${order.id} criado. Aguardando confirmação...`);
      navigate({ to: '/order/$id', params: { id: order.id } });
    } catch (err: unknown) {
      if (isApiError(err)) {
        if (err.fields) setFieldErrors(err.fields);
        if (err.code === 'price_changed') {
          setCartError('Preço mudou. Revise os valores antes de confirmar novamente.');
        } else if (err.code === 'edition_unavailable') {
          setCartError(err.message);
        } else {
          toast.error(err.message);
        }
      } else {
        toast.error((err as { message?: string })?.message ?? 'Falha ao criar pedido.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const set = <K extends keyof OrderCollectorInfo>(key: K, value: OrderCollectorInfo[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const totals = cart.data.totals;
  const primaryWallet = (wallets.data ?? []).find((w) => w.isPrimary);

  return (
    <section className="container py-10">
      <nav aria-label="Trilha" className="mb-4 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-primary">Início</Link> /{' '}
        <Link to="/cart" className="hover:text-primary">Carrinho</Link> /{' '}
        <span className="text-primary">Pagamento</span>
      </nav>

      {cartError && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-3 rounded-md border border-warning/40 bg-warning/10 p-4 text-sm text-foreground"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 text-warning" aria-hidden />
          <div className="flex-1">
            <p>{cartError}</p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => {
                setCartError(null);
                void cart.refetch();
              }}
            >
              Recalcular cotação
            </Button>
          </div>
        </div>
      )}

      <form className="grid gap-8 lg:grid-cols-[1.2fr_1fr]" onSubmit={onSubmit} noValidate>
        <div className="space-y-8">
          <div className="card-surface p-6">
            <h2 className="font-display text-xl font-bold">Perfil do colecionador</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Field label="Nome de exibição" htmlFor="displayName" required error={fieldErrors.displayName}>
                <Input id="displayName" value={form.displayName} onChange={(e) => set('displayName', e.target.value)} required invalid={Boolean(fieldErrors.displayName)} />
              </Field>
              <Field label="Nome de usuário" htmlFor="username" required error={fieldErrors.username}>
                <Input id="username" value={form.username} onChange={(e) => set('username', e.target.value)} required invalid={Boolean(fieldErrors.username)} />
              </Field>
              <Field label="Rede" htmlFor="network" required>
                <Select value={form.network} onValueChange={(v) => set('network', v as WalletNetwork)}>
                  <SelectTrigger id="network">
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
              <Field label="Endereço da carteira" htmlFor="address" required error={fieldErrors.walletAddress} hint={primaryWallet && !useOtherWallet ? `Sugerido: carteira ${primaryWallet.label}` : 'Use o botão Conectar abaixo'}>
                <Input
                  id="address"
                  value={useOtherWallet ? form.walletAddress : form.walletAddress || primaryWallet?.address || ''}
                  onChange={(e) => set('walletAddress', e.target.value)}
                  placeholder="0x..."
                  invalid={Boolean(fieldErrors.walletAddress)}
                />
              </Field>
              <Field label="Nome ENS" htmlFor="ensName" hint="Opcional">
                <Input
                  id="ensName"
                  value={form.ensName ?? ''}
                  onChange={(e) => set('ensName', e.target.value)}
                  prefix={<span className="text-xs">.eth</span>}
                />
              </Field>
              <Field label="Tipo de carteira" htmlFor="walletType" required>
                <Select value={walletProvider} onValueChange={(v) => setWalletProvider(v as WalletProvider)}>
                  <SelectTrigger id="walletType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="metamask">MetaMask</SelectItem>
                    <SelectItem value="walletconnect">WalletConnect</SelectItem>
                    <SelectItem value="coinbase">Coinbase Wallet</SelectItem>
                    <SelectItem value="multichain">Multichain</SelectItem>
                    <SelectItem value="nova">Nova</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="E-mail" htmlFor="email" required error={fieldErrors.email}>
                <Input id="email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} required invalid={Boolean(fieldErrors.email)} />
              </Field>
              <Field label="Observação do colecionador" htmlFor="note" hint="Opcional" className="md:col-span-2">
                <textarea
                  id="note"
                  rows={3}
                  value={form.note ?? ''}
                  onChange={(e) => set('note', e.target.value)}
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                />
              </Field>
            </div>
          </div>

          <div className="card-surface p-6">
            <h2 className="font-display text-xl font-bold">Conexão da carteira</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              A simulação conecta, recusa ou desconecta conforme você interage. Use os botões para validar cada estado.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
              <WalletStatusPill status={walletStatus} provider={walletProvider} />
              <span aria-live="polite" className="text-muted-foreground">
                {walletStatus === 'connected' && form.walletAddress
                  ? `Endereço conectado: ${form.walletAddress.slice(0, 6)}…${form.walletAddress.slice(-4)}`
                  : 'Nenhuma carteira conectada ainda.'}
              </span>
            </div>

            <ul className="mt-4 space-y-2">
              {[
                { id: 'walletconnect', label: 'WalletConnect · Multichain', icon: <Wallet className="h-4 w-4" /> },
                { id: 'metamask', label: 'MetaMask', icon: <ShieldCheck className="h-4 w-4" /> },
                { id: 'coinbase', label: 'Coinbase Wallet', icon: <Wallet className="h-4 w-4" /> },
              ].map((p) => (
                <li key={p.id}>
                  <label className="flex cursor-pointer items-center gap-3 rounded-md border border-border bg-card/40 p-3 text-sm hover:border-primary has-[:checked]:border-primary has-[:checked]:bg-primary/10">
                    <input
                      type="radio"
                      name="wallet"
                      value={p.id}
                      checked={walletProvider === p.id}
                      onChange={() => setWalletProvider(p.id as WalletProvider)}
                      className="h-4 w-4 accent-primary"
                    />
                    <span aria-hidden className="text-primary">
                      {p.icon}
                    </span>
                    <span>{p.label}</span>
                  </label>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={onConnectWallet}
                disabled={walletStatus === 'connecting'}
              >
                <PlugZap className="h-4 w-4" />
                {walletStatus === 'connecting' ? 'Conectando…' : 'Conectar carteira'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onDisconnectWallet}
                disabled={walletStatus !== 'connected'}
              >
                <Unplug className="h-4 w-4" />
                Desconectar
              </Button>
              <label className="inline-flex items-center gap-2 text-sm text-foreground/80">
                <input
                  type="checkbox"
                  checked={useOtherWallet}
                  onChange={(e) => setUseOtherWallet(e.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                Usar outra carteira manualmente
              </label>
            </div>
          </div>
        </div>

        <aside aria-label="Resumo do pedido" className="space-y-6">
          <div className="card-surface p-6">
            <h2 className="font-display text-lg font-bold">Seus NFTs</h2>
            <ul className="mt-4 space-y-3">
              {cart.data.items.map((item) => {
                const nft = nftMap.get(item.nftId);
                return (
                  <li key={item.nftId} className="flex items-center gap-3 text-sm">
                    <div className="relative h-10 w-10 overflow-hidden rounded-md border border-border">
                      {nft ? (
                        <NftArt seed={nft.name} className="absolute inset-0 h-full w-full" />
                      ) : (
                        <div className="h-full w-full bg-secondary" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{nft?.name ?? item.nftId}</p>
                      <p className="text-xs text-muted-foreground">
                        ID do token: {nft?.tokenId ?? '—'} (x {item.quantity})
                      </p>
                    </div>
                    <p className="font-mono text-primary">
                      {lineTotal(item.priceSnapshot.amount, item.quantity)} ETH
                    </p>
                  </li>
                );
              })}
            </ul>

            <div className="mt-4 space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-mono">{formatEth(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Desconto do lançamento</span>
                <span className="font-mono">(-) {formatEth(totals.discount)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Taxa de rede</span>
                <span className="font-mono">{formatEth(totals.networkFee)}</span>
              </div>
              <hr className="my-2 border-border" />
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span className="font-mono text-primary">{formatEth(totals.total)}</span>
              </div>
              <p className="text-right text-[10px] text-muted-foreground">
                Versão da cotação: v{totals.version} ·{' '}
                {new Date(totals.expiresAt).toLocaleTimeString('pt-BR')}
              </p>
            </div>
          </div>

          <Button type="submit" size="lg" className="w-full" disabled={submitting}>
            {submitting ? 'Enviando pedido…' : 'Confirmar compra'}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            O pedido usa idempotência. Recarregar ou reenviar não duplica a compra.
          </p>
        </aside>
      </form>
    </section>
  );
}

function WalletStatusPill({ status, provider }: { status: WalletStatus; provider: WalletProvider }) {
  const map: Record<WalletStatus, { label: string; className: string }> = {
    idle: { label: 'Desconectada', className: 'border-border text-muted-foreground' },
    connecting: { label: 'Conectando…', className: 'border-warning/40 bg-warning/10 text-warning' },
    connected: { label: `Conectada (${provider})`, className: 'border-success/40 bg-success/10 text-success' },
    rejected: { label: 'Recusada pelo usuário', className: 'border-destructive/40 bg-destructive/10 text-destructive' },
    disconnected: { label: 'Desconectada', className: 'border-border text-muted-foreground' },
  };
  const entry = map[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 ${entry.className}`}>
      <Plug className="h-3 w-3" aria-hidden />
      {entry.label}
    </span>
  );
}