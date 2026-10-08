import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { CheckCircle2, XCircle, Loader2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { NftArt } from '@/components/nft/nft-art';
import { useOrderSocket } from '@/hooks/use-socket';
import { useOrder } from '@/hooks/use-orders';
import { formatEth, formatDateTime } from '@/lib/format';
import { NETWORK_LABELS } from '@/api/search-params';
import { getSessionToken } from '@/api/client';

export const Route = createFileRoute('/order/$id')({
  beforeLoad: ({ location }) => {
    if (!getSessionToken()) {
      throw redirect({
        to: '/login',
        search: { redirect: location.pathname },
      });
    }
  },
  component: OrderPage,
});

function OrderPage() {
  const { id } = Route.useParams();
  const order = useOrder(id);
  useOrderSocket(order.data?.id);

  if (order.isLoading) {
    return (
      <section className="container py-12">
        <div className="mx-auto max-w-2xl">
          <Skeleton className="h-32" rounded="lg" />
          <Skeleton className="mt-6 h-64" rounded="lg" />
        </div>
      </section>
    );
  }

  if (!order.data) {
    return (
      <section className="container py-16">
        <div className="card-surface mx-auto max-w-md p-10 text-center">
          <h1 className="font-display text-2xl font-bold">Pedido não encontrado</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Esse pedido pode ter expirado ou ainda não foi processado.
          </p>
          <Button asChild className="mt-6">
            <Link to="/">Voltar ao início</Link>
          </Button>
        </div>
      </section>
    );
  }

  const status = order.data.status;

  return (
    <section className="container py-12">
      <div className="mx-auto max-w-2xl">
        <div className="card-surface overflow-hidden">
          <div className="flex items-center justify-between border-b border-border bg-card/40 p-5">
            <div className="flex items-center gap-3">
              {status === 'confirmed' && <CheckCircle2 className="h-8 w-8 text-success" />}
              {status === 'rejected' && <XCircle className="h-8 w-8 text-destructive" />}
              {status === 'pending' && <Loader2 className="h-8 w-8 animate-spin text-primary" />}
              <div>
                <p className="text-sm uppercase tracking-widest text-primary">
                    {status === 'confirmed' && 'Compra confirmada'}
                    {status === 'rejected' && 'Pagamento recusado'}
                    {status === 'pending' && 'Aguardando confirmação'}
                  </p>
                  <h1 className="font-display text-xl font-bold">
                    {status === 'confirmed' && 'Seus NFTs agora estão na sua carteira'}
                    {status === 'rejected' && 'O pagamento foi recusado'}
                    {status === 'pending' && 'Processando seu pedido'}
                  </h1>
                </div>
              </div>
              <Badge variant={status === 'confirmed' ? 'success' : status === 'rejected' ? 'danger' : 'warning'}>
                {status.toUpperCase()}
              </Badge>
          </div>

          <div className="grid grid-cols-4 gap-3 px-5 py-4 text-xs uppercase tracking-wider text-muted-foreground">
            <span>ID da transação</span>
            <span>Data</span>
            <span>Total</span>
            <span>Carteira</span>
          </div>
          <div className="grid grid-cols-4 gap-3 px-5 pb-4 font-mono text-sm">
            <span className="truncate" title={order.data.transaction?.hash ?? '—'}>
              {order.data.transaction?.hash
                ? `${order.data.transaction.hash.slice(0, 6)}…${order.data.transaction.hash.slice(-4)}`
                : '—'}
            </span>
            <span>{formatDateTime(order.data.createdAt)}</span>
            <span className="text-primary">{formatEth(order.data.totals.total)}</span>
            <span>{order.data.transaction ? `${order.data.transaction.walletAddress.slice(0, 6)}…` : '—'}</span>
          </div>

          <div className="border-t border-border px-5 py-4">
            <h2 className="text-xs uppercase tracking-widest text-primary">Detalhes da transação</h2>
            <table className="mt-3 w-full text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-2 text-left">NFTs</th>
                  <th className="py-2 text-left">Edições</th>
                  <th className="py-2 text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {order.data.items.map((item) => (
                  <tr key={item.nftId} className="border-t border-border">
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <div className="relative h-8 w-8 rounded-md border border-border">
                          <NftArt seed={item.name} className="absolute inset-0 h-full w-full" />
                        </div>
                        <div>
                          <p className="font-semibold">{item.name}</p>
                          <p className="text-xs text-muted-foreground">#{item.tokenId}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-2 font-mono">x {item.edition}</td>
                    <td className="py-2 text-right font-mono text-primary">{formatEth(item.subtotal)}</td>
                  </tr>
                ))}
                <tr className="border-t border-border">
                  <td className="py-2" colSpan={2}>
                    Taxa de rede
                  </td>
                  <td className="py-2 text-right font-mono">{formatEth(order.data.totals.networkFee)}</td>
                </tr>
                <tr className="border-t border-border">
                  <td className="py-2 font-bold" colSpan={2}>
                    Total
                  </td>
                  <td className="py-2 text-right font-mono text-base font-bold text-primary">
                    {formatEth(order.data.totals.total)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="border-t border-border bg-card/40 p-5 text-center">
            {status === 'confirmed' && order.data.transaction && (
              <>
                <p className="text-sm text-muted-foreground">
                  Transação confirmada na {NETWORK_LABELS[order.data.transaction.network]}. A propriedade foi
                  transferida para a sua carteira e registrada na rede.
                </p>
                <Button asChild className="mt-4">
                  <a href={order.data.transaction.explorerUrl} target="_blank" rel="noreferrer">
                    Ver no Etherscan <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </>
            )}
            {status === 'rejected' && (
              <p className="text-sm text-destructive">
                {order.data.failureReason ?? 'Tente novamente ou use outra carteira.'}
              </p>
            )}
            {status === 'pending' && (
              <p className="text-sm text-muted-foreground">
                Estamos processando seu pedido. Esta página se atualiza em tempo real.
              </p>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Recibo gerado a partir do snapshot do pedido. Alterações posteriores no catálogo não modificam este
          recibo.
        </p>
      </div>
    </section>
  );
}