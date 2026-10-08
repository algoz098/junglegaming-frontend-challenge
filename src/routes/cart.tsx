import { createFileRoute, Link } from '@tanstack/react-router';
import { useState } from 'react';
import { toast } from 'sonner';
import { ShoppingCart, Trash2, Plus, Minus, Tag, X, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { NftArt } from '@/components/nft/nft-art';
import {
  useApplyCoupon,
  useCart,
  useRemoveCoupon,
  useRemoveFromCart,
  useUpdateCartItem,
} from '@/hooks/use-cart';
import { useGuestCart } from '@/hooks/use-guest-cart';
import { useNftList } from '@/hooks/use-nfts';
import { useAuth } from '@/hooks/use-auth';
import { formatEth } from '@/lib/format';
import { lineTotal } from '@/lib/line-total';

export const Route = createFileRoute('/cart')({
  component: CartPage,
});

/* Não há guard aqui: visitantes podem ver/editar carrinho local antes de logar. */

function CartPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const cart = useCart();
  const guest = useGuestCart();
  const update = useUpdateCartItem();
  const remove = useRemoveFromCart();
  const applyCoupon = useApplyCoupon();
  const removeCoupon = useRemoveCoupon();
  const [code, setCode] = useState('');
  const nftQuery = useNftList({ pageSize: 48 });
  const nftMap = new Map((nftQuery.data?.data ?? []).map((n) => [n.id, n]));

  if (authLoading) return <Skeleton className="m-10 h-96" rounded="lg" />;

  if (!isAuthenticated) {
    if (guest.cart.items.length === 0) {
      return (
        <section className="container py-16">
          <div className="card-surface mx-auto max-w-md p-10 text-center">
            <ShoppingCart className="mx-auto h-10 w-10 text-primary" />
            <h1 className="mt-4 font-display text-2xl font-bold">Seu carrinho está esperando</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Entre na sua conta para ver os NFTs que você adicionou.
            </p>
            <Button asChild className="mt-6">
              <Link to="/login" search={{ redirect: '/cart' }}>
                Entrar
              </Link>
            </Button>
          </div>
        </section>
      );
    }

    return (
      <section className="container py-10">
        <div className="mb-6 rounded-md border border-warning/40 bg-warning/10 p-4 text-sm">
          <p>
            Você tem {guest.cart.items.length} {guest.cart.items.length === 1 ? 'NFT salvo' : 'NFTs salvos'} como visitante.
            <Link to="/login" search={{ redirect: '/cart' }} className="ml-2 font-semibold text-primary hover:underline">
              Entrar para sincronizar com sua conta
            </Link>
          </p>
        </div>
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <div className="card-surface overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-card/40">
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="p-4">NFTs</th>
                  <th className="p-4">Preço</th>
                  <th className="p-4">Edições</th>
                  <th className="p-4">Total</th>
                  <th className="p-4" aria-label="Ações" />
                </tr>
              </thead>
              <tbody>
                {guest.cart.items.map((item) => {
                  const nft = nftMap.get(item.nftId);
                  return (
                    <tr key={item.nftId} className="border-b border-border last:border-b-0">
                      <td className="p-4">
                        <Link to="/nft/$id" params={{ id: item.nftId }} className="flex items-center gap-3">
                          <div className="relative h-12 w-12 overflow-hidden rounded-md border border-border bg-secondary">
                            {nft ? (
                              <NftArt seed={nft.name} className="absolute inset-0 h-full w-full" />
                            ) : (
                              <Skeleton className="absolute inset-0 rounded-none" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{nft?.name ?? item.nftId}</p>
                            <p className="text-xs text-muted-foreground">ID do token: {nft?.tokenId ?? '—'}</p>
                          </div>
                        </Link>
                      </td>
                      <td className="p-4 font-mono text-primary">{formatEth(item.priceSnapshot.amount)}</td>
                      <td className="p-4 font-mono">{item.quantity}</td>
                      <td className="p-4 font-mono font-bold text-primary">
                        {lineTotal(item.priceSnapshot.amount, item.quantity)} ETH
                      </td>
                      <td className="p-4 text-right">
                        <button
                          type="button"
                          aria-label="Remover do carrinho"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-destructive hover:bg-secondary"
                          onClick={() => guest.removeItem(item.nftId)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <aside aria-label="Resumo do carrinho" className="card-surface p-6">
            <h2 className="font-display text-lg font-bold">Resumo da carteira</h2>
            <dl className="mt-6 space-y-2 text-sm">
              <Row label="Subtotal" value={formatEth(guest.cart.totals.subtotal)} />
              <Row label="Taxa de rede" value={formatEth(guest.cart.totals.networkFee)} muted />
              <hr className="border-border" />
              <Row label="Total" value={formatEth(guest.cart.totals.total)} strong />
            </dl>
            <Button asChild className="mt-6 w-full" size="lg">
              <Link to="/login" search={{ redirect: '/cart' }}>
                <LogIn className="h-4 w-4" /> Entrar para finalizar
              </Link>
            </Button>
          </aside>
        </div>
      </section>
    );
  }

  if (cart.isLoading) {
    return (
      <section className="container py-10">
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24" rounded="lg" />
            ))}
          </div>
          <Skeleton className="h-72" rounded="lg" />
        </div>
      </section>
    );
  }

  const data = cart.data;
  if (!data || data.items.length === 0) {
    return (
      <section className="container py-16">
        <div className="card-surface mx-auto max-w-md p-10 text-center">
          <ShoppingCart className="mx-auto h-10 w-10 text-primary" />
          <h1 className="mt-4 font-display text-2xl font-bold">Seu carrinho está vazio</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Adicione NFTs do catálogo para começar a comprar.
          </p>
          <Button asChild className="mt-6">
            <Link to="/">Explorar catálogo</Link>
          </Button>
        </div>
      </section>
    );
  }

  const onApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    applyCoupon.mutate(code.trim().toUpperCase(), {
      onSuccess: ({ coupon }) => {
        toast.success(`Cupom ${coupon.code} aplicado.`);
        setCode('');
      },
      onError: (err: unknown) =>
        toast.error((err as { message?: string })?.message ?? 'Cupom inválido.'),
    });
  };

  return (
    <section className="container py-10">
      <nav aria-label="Trilha" className="mb-4 text-xs text-muted-foreground">
        <Link to="/" className="hover:text-primary">Início</Link> / <span className="text-primary">Carrinho de NFTs</span>
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="card-surface overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-card/40">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="p-4">NFTs</th>
                <th className="p-4">Preço</th>
                <th className="p-4">Edições</th>
                <th className="p-4">Total</th>
                <th className="p-4" aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => {
                const nft = nftMap.get(item.nftId);
                return (
                  <tr key={item.nftId} className="border-b border-border last:border-b-0">
                    <td className="p-4">
                      <Link to="/nft/$id" params={{ id: item.nftId }} className="flex items-center gap-3">
                        <div className="relative h-12 w-12 overflow-hidden rounded-md border border-border">
                          {nft ? (
                            <NftArt seed={nft.name} className="absolute inset-0 h-full w-full" />
                          ) : (
                            <Skeleton className="absolute inset-0 rounded-none" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{nft?.name ?? item.nftId}</p>
                          <p className="text-xs text-muted-foreground">ID do token: {nft?.tokenId ?? '—'}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="p-4 font-mono text-primary">{formatEth(item.priceSnapshot.amount)}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          aria-label="Diminuir quantidade"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-secondary disabled:opacity-50"
                          onClick={() => update.mutate({ nftId: item.nftId, quantity: Math.max(1, item.quantity - 1) })}
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-6 text-center font-mono">{item.quantity}</span>
                        <button
                          type="button"
                          aria-label="Aumentar quantidade"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-secondary"
                          onClick={() => update.mutate({ nftId: item.nftId, quantity: item.quantity + 1 })}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                    <td className="p-4 font-mono font-bold text-primary">
                      {lineTotal(item.priceSnapshot.amount, item.quantity)} ETH
                    </td>
                    <td className="p-4 text-right">
                      <button
                        type="button"
                        aria-label="Remover do carrinho"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-destructive hover:bg-secondary"
                        onClick={() =>
                          remove.mutate(item.nftId, {
                            onSuccess: () => toast.success('Item removido.'),
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <aside aria-label="Resumo do carrinho" className="card-surface p-6">
          <h2 className="font-display text-lg font-bold">Resumo da carteira</h2>

          <form className="mt-4 flex gap-2" onSubmit={onApplyCoupon}>
            <Input
              placeholder="Digite o código promocional…"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              aria-label="Código promocional"
            />
            <Button type="submit" variant="secondary" disabled={applyCoupon.isPending}>
              <Tag className="h-4 w-4" />
              Aplicar
            </Button>
          </form>

          {data.totals.appliedCoupon && (
            <p className="mt-2 inline-flex items-center gap-2 rounded-md border border-success/40 bg-success/10 px-2 py-1 text-xs text-success">
              {data.totals.appliedCoupon.code} aplicado.
              <button
                type="button"
                onClick={() =>
                  removeCoupon.mutate(undefined, {
                    onSuccess: () => toast.success('Cupom removido.'),
                  })
                }
                aria-label="Remover cupom"
              >
                <X className="h-3 w-3" />
              </button>
            </p>
          )}

          <dl className="mt-6 space-y-2 text-sm">
            <Row label="Subtotal" value={formatEth(data.totals.subtotal)} />
            <Row label="Desconto do lançamento" value={`(-) ${formatEth(data.totals.discount)}`} muted />
            <Row
              label="Taxa de rede"
              value={formatEth(data.totals.networkFee)}
              muted
              hint="Taxa estimada"
            />
            <hr className="border-border" />
            <Row label="Total" value={formatEth(data.totals.total)} strong />
          </dl>

          <Button asChild className="mt-6 w-full" size="lg">
            <Link to="/checkout">Conectar e finalizar</Link>
          </Button>
          <Link
            to="/"
            className="mt-3 block text-center text-xs text-muted-foreground hover:text-primary"
          >
            Continuar explorando
          </Link>
        </aside>
      </div>
    </section>
  );
}

function Row({
  label,
  value,
  strong,
  muted,
  hint,
}: {
  label: string;
  value: string;
  strong?: boolean;
  muted?: boolean;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className={muted ? 'text-muted-foreground' : 'text-foreground/80'}>{label}</dt>
      <dd
        className={`font-mono ${strong ? 'text-base font-bold text-primary' : 'text-foreground'} ${
          muted ? 'text-muted-foreground' : ''
        }`}
      >
        {value}
        {hint && <span className="block text-[10px] text-muted-foreground">{hint}</span>}
      </dd>
    </div>
  );
}