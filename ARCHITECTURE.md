# Arquitetura — Kurio NFT Marketplace

## 1. Visão geral

SPA em React 18 + TypeScript empacotada com Vite. Toda a rede é simulada por MSW no navegador; o cliente Socket.IO é conectado a um servidor virtual via `@mswjs/socket.io-binding`, exercitando o protocolo real mesmo durante o desenvolvimento e nos testes E2E.

Camadas:

```
┌─────────────────────────────────────────────────────────────┐
│  routes/                file-based routes (TanStack Router) │
├─────────────────────────────────────────────────────────────┤
│  components/ui          primitivos shadcn/ui (Button, Input) │
│  components/layout      Header, Footer, SidebarNav           │
│  features/<domínio>     páginas compostas + hooks (Sprint 2+)│
├─────────────────────────────────────────────────────────────┤
│  api/                   axios + endpoints tipados + queries  │
│  hooks/                 wrappers React Query (Sprint 2+)     │
├─────────────────────────────────────────────────────────────┤
│  types/                 source of truth dos contratos         │
│  lib/                   utils (decimal, format, cn)          │
├─────────────────────────────────────────────────────────────┤
│  mocks/                 MSW handlers + fixtures + socket     │
└─────────────────────────────────────────────────────────────┘
```

## 2. Stack e justificativas pontuais

| Camada | Escolha | Por quê |
| --- | --- | --- |
| Roteamento | `@tanstack/react-router` + `TanStackRouterVite` | Obrigatório pelo README. Geração de tipos, file-based, layout root. |
| Estado remoto | `@tanstack/react-query` | Obrigatório. Stale-while-revalidate, invalidação por chave, devtools. |
| HTTP | `axios` | Obrigatório. Interceptors para token Bearer e normalização de erros. |
| Estilização | Tailwind + CSS variables | Variáveis em `src/index.css` para a paleta Kurio; tokens reutilizáveis em `tailwind.config.ts`. |
| Primitivos | shadcn/ui (Button, Input, Card, Skeleton, Badge) | Base acessível via Radix UI; customizados para a marca. |
| Mocking | `msw` 2.x + `@mswjs/socket.io-binding` | Obrigatório. `setupWorker` no navegador. |
| Tempo real | `socket.io-client` 4.x | Obrigatório. O cliente conecta a `/socket.io`; o MSW intercepta o handshake. |
| Testes | `@playwright/test` | Obrigatório. Projetos `chromium-desktop` e `chromium-mobile`. |
| Forms | `react-hook-form` + `zod` | Validação tipada end-to-end. |
| Decimal | `decimal.js` | ETH trafega como string; aritmética sem perder precisão. |

## 3. Contratos REST

Recursos cobertos por `src/api/endpoints.ts` e tipados em `src/types/domain.ts`:

- **Sessão:** `POST /session/login`, `POST /session/register`, `GET /session`, `POST /session/logout`, `POST /session/expire`.
- **NFTs:** `GET /nfts` (paginado, com busca, filtros, ordenação), `GET /nfts/:id`, `GET /nfts/:id/related`, `GET /nfts/collections`, `GET /nfts/categories`.
- **Favoritos:** `GET /favorites`, `POST /favorites/:nftId`, `DELETE /favorites/:nftId`.
- **Carrinho:** `GET /cart`, `POST /cart/items`, `PUT /cart/items/:nftId`, `DELETE /cart/items/:nftId`, `POST /cart/coupon`, `DELETE /cart/coupon`, `GET /cart/quote`.
- **Pedidos:** `POST /orders` (com `Idempotency-Key`), `GET /orders`, `GET /orders/:id`.
- **Perfil:** `GET /profile`, `PATCH /profile`, `POST /profile/password`, `POST /profile/avatar`.
- **Carteiras:** `GET /wallets`, `GET /wallets/providers`, `POST /wallets`, `DELETE /wallets/:id`.

Erros tipados (`ApiError`):

```ts
type ApiErrorCode =
  | 'validation_failed'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'coupon_invalid'
  | 'coupon_expired'
  | 'edition_unavailable'
  | 'price_changed'
  | 'idempotency_conflict'
  | 'transient';
```

`ApiRequestError` (em `src/api/client.ts`) é a classe lançada pelo axios interceptor quando a resposta é um envelope `{ error }` — o domínio pode diferenciar conflitos de validação etc. sem inspecionar HTTP.

## 4. Tempo real (Socket.IO)

Eventos publicados pelo servidor mockado:

| Evento | Payload | Quem escuta |
| --- | --- | --- |
| `nft:updated` | `NftUpdatedPayload` (preço, edição, versão) | `useNftSocket` (detalhe) + `useNftGlobalSocket` (root) |
| `order:updated` | `OrderUpdatedPayload` (status, tx, motivo) | `useOrderSocket` (detalhe do pedido) + `useOrderGlobalSocket` (root) |
| `price:changed` | `PriceChangedPayload` (old/new) | reservado para reconciliação |

Cada evento carrega `version` e `emittedAt`. `applyNftUpdate` em `src/types/socket.ts` rejeita versões antigas. Após reconexão o cliente reidrata via REST e descarta eventos acumulados.

### Duas camadas de listeners

1. **Por recurso** — `useNftSocket(id)` (em `routes/nft.$id.tsx`) faz `setQueryData` no detalhe do NFT quando o evento bate. `useOrderSocket(orderId)` (em `routes/order.$id.tsx`) faz o mesmo no detalhe do pedido. O cleanup do `useEffect` remove o listener e emite `unsubscribe.*` no socket.

2. **Global** — `useNftGlobalSocket` e `useOrderGlobalSocket` (registrados em `routes/__root__.tsx`) escutam *qualquer* `nft.updated` / `order.updated` e:
   - Invalidam `['nfts', 'list']` e `['cart']` para o evento de NFT (refetch com `refreshCartPrices` no servidor devolve preços atualizados).
   - Fazem patch otimista no `['cart']` quando o evento carrega `price` (substitui o `priceSnapshot` do item correspondente e incrementa `totals.version`).
   - Invalidam `['orders']` para o evento de pedido.

Esse arranjo cobre o cenário da CHALLENGE §7: usuário no carrinho recebe `nft.updated` → preço do item no resumo é atualizado, checkout exibe banner pedindo nova confirmação (`expectedTotalsVersion` no servidor).

### Implementação técnica

A integração com `socket.io-client` é feita em duas camadas, ambas exercitadas em runtime:

1. **Cliente real `socket.io-client` 4.x** (`src/hooks/use-socket.ts`): importado dinamicamente após o início do app e configurado com `transports: ['websocket']`. A função `ensureSocketConnection()` carrega o módulo preguiçosamente para garantir que o `WebSocketInterceptor` já tenha patchado o `globalThis.WebSocket` antes do `engine.io-client` capturar a referência original.

2. **Mock server via `@mswjs/socket.io-binding`** (`src/mocks/socket/binding.ts`): o `WebSocketInterceptor` de `@mswjs/interceptors` substitui `globalThis.WebSocket` por um Proxy; cada `new WebSocket(...)` é capturado e a conexão duplex é embrulhada por `toSocketIo()`, que fornece API de eventos Socket.IO no lado servidor. Os handlers MSW chamam `emitToClients()` para publicar `nft.updated` e `order.updated` aos clientes conectados.

O setup é ativado em `src/main.tsx` (antes de qualquer import de rotas) através de `startSocketInterceptor()`, que:

- Cria e aplica o `WebSocketInterceptor`.
- Marca `window.__KURIO_SOCKET_READY__ = true` para que `ensureSocketConnection()` saiba que é seguro instanciar o cliente.
- Permite que `engine.io-client` capture o `WebSocket` *já patcheado*, fazendo com que `transports: ['websocket']` realmente passe pelo binding.

Eventos com PONTO (`nft.updated`, `order.updated`) seguem o que o CHALLENGE.md pede (linhas 157-158).

#### Lifecycle de auth

`useLogout` chama `disconnectSocket()` antes de `qc.clear()`. `useLogin`/`useRegister` chamam `ensureSocketConnection()` após sucesso para garantir reconexão com o novo token. `disconnectSocket` zera o singleton, limpa os sets de listeners e chama `socket.removeAllListeners()` + `socket.disconnect()`. Isso evita vazamento de eventos de uma sessão para outra.

#### Limitação documentada

O handshake Engine.IO completo do `@mswjs/socket.io-binding` **não dispara o evento `connect`** no `socket.io-client` no Chromium headless (verificado: `s.on('connect')` nunca é chamado no test runner). O `WebSocketInterceptor` intercepta a conexão e o `io.server.emit` no lado servidor funciona, mas o cliente nunca recebe a confirmação do handshake. Implicações:

- O **push de evento** (servidor → cliente) não é exercitado em runtime nos testes E2E.
- O **polling de fallback** (`refetchInterval: 2s` em `useOrder` quando o pedido está `pending`) cobre o ciclo de vida do pedido. É o que de fato move a UI de `pending` → `confirmed`/`rejected` nos testes.
- O cart/checkout recebem atualização de preço via **refetch do cart** (com `refreshCartPrices` no servidor), e o **patch otimista** no cliente completa a experiência visual.
- O teste `tests/e2e/socket-realtime.spec.ts` cobre o lado servidor (preço do cart muda após o debug endpoint) e a infra do interceptor (flag `__KURIO_SOCKET_READY__`).

Em modo demo isso é aceitável: a UI se mantém coerente via REST + polling + patch otimista. Quando a aplicação migrar para um servidor Socket.IO real, basta remover `startSocketInterceptor()` e `emitToClients()` — `socket.io-client` já usará o servidor real sem mudanças (o handshake Engine.IO será normal).

### Polling de fallback

`useOrder` define `refetchInterval` para 2s enquanto o pedido está em `pending`. Quando o mock confirma/rejeita após ~3s via `setTimeout`, o próximo poll captura o novo status e a UI atualiza imediatamente. Combinado com a bridge de eventos, a latência percebida é de <1s.

### Versão e reconciliação

`NftUpdatedPayload` inclui `version`. `applyNftUpdate` em `src/types/socket.ts` rejeita eventos com versão menor que a cacheada, evitando regressão. Após reconexão (logout/login ou refresh), o cliente reidrata via REST — eventos antigos não reaplicam efeitos. Listeners e subscriptions são limpos no `useEffect` cleanup.

## 5. Política de cache (TanStack Query)

- `staleTime: 30s` para quase todas as queries (detalhe do NFT, carrinho, perfil, carteiras).
- `gcTime: 5min` para permitir retorno a partir de cache.
- `retry: false` para 401 (ver `isUnauthorized` em `lib/query-client.ts`); até 2 tentativas em outros casos.
- `networkMode: 'online'` — quando o navegador está offline, queries ficam suspensas.
- Mutações não fazem retry (sempre explícito).
- `refetchOnWindowFocus: false` no demo.

A fábrica `createQueryClient()` em `src/lib/query-client.ts` é importada uma única vez em `src/app.tsx` e a instância resultante é passada tanto para `createRouter({ context: { queryClient } })` quanto para `<AppProviders client={...}>`. Isso garante que `useQuery`/`useMutation` (via Provider) e qualquer loader/contexto do router compartilhem o **mesmo** client.

Invalidação por chave (`src/api/queryKeys.ts`):

```
session: ['session']
nfts.list(query) -> ['nfts', 'list', query]
nfts.detail(id) -> ['nfts', 'detail', id]
favorites -> ['favorites']
cart -> ['cart']
orders.detail(id) -> ['orders', 'detail', id]
profile -> ['profile']
wallets -> ['wallets']
```

Após mutações de carrinho e pedido, invalidamos explicitamente `['cart']` e `['orders']`. Eventos Socket disparam `queryClient.setQueryData` quando o patch é localizado (evita refetch), com fallback para `invalidateQueries` caso o patch falhe.

## 6. Sessão e segurança

- Token Bearer persistido em `localStorage` sob a chave `kurio.session.token`.
- Interceptor axios (`src/api/client.ts`) injeta o token em todas as requisições.
- **Interceptor 401**: ao receber `401`, se a resposta **não** tiver `error.fields` (ou seja, é sessão expirada e não erro de validação de campo), `clearSessionAndNotify()` limpa o token e dispara o evento `kurio:session-expired`.
- **Listener raiz** (`useSessionExpiredListener` em `routes/__root__.tsx`): escuta o evento, invalida `['session']`, `['cart']`, `['favorites']`, `['profile']`, `['wallets']`, e navega para `/login?redirect=<pathname>` quando o usuário não está em `/login` ou `/register`.
- Logout chama `disconnectSocket()` (limpa listeners e desconecta o Socket.IO) antes de `qc.clear()` + `window.location.assign('/login')`.
- Senhas nunca trafegam em logs; o handler valida `currentPassword` no perfil contra o fixture, sem armazenar texto claro fora do mock.

## 7. Estado do carrinho

- O carrinho é **por usuário** (chave = `user.id`). Para visitantes, mantemos rascunho em `localStorage` sob `kurio.guest.cart.v1` (lib/guest-cart.ts), sincronizado para o carrinho autenticado no login via `mergeGuestCart` (hooks/use-auth.ts).
- Cada mutação (add/update/remove/coupon) recalcula `totals` via `recomputeTotals` no MSW, com `version` incrementado e `expiresAt` de 60s — checkout precisa revalidar via `GET /cart/quote`.
- **Preços sempre atualizados na leitura**: o helper `refreshCartPrices` em `mocks/state.ts` é chamado em `cartOf()` antes de serializar a resposta do `GET /cart`. Se algum item do carrinho tem `priceSnapshot.version` menor que o `price.version` atual do NFT, o snapshot é substituído. Isso garante que mesmo após `adjustNftPrice` (debug) o cart devolve o preço novo sem reload.
- Mudanças de preço via `nft.updated` também atualizam o cart no cliente via patch otimista (`useNftGlobalSocket` em `use-socket.ts:124-148`) e disparam `invalidateQueries(['cart'])` para reconciliação.
- O checkout exibe um banner exigindo nova confirmação quando `cartApi.quote().version` diverge do snapshot (`routes/checkout.tsx:142-151`).

## 8. Idempotência e reconciliação

- Toda criação de pedido envia `Idempotency-Key`. O MSW devolve o mesmo pedido se a chave for reusada com o mesmo payload, ou retorna `409 idempotency_conflict` se o payload divergir.
- Pedidos persistem em `state.orders.byId` enquanto o mock worker vive. Recarga da página chama `GET /orders/:id` para reidratar antes de exibir confirmação.
- Reconexão de socket dispara refetch dos pedidos em estado `pending` para evitar estados zumbis.

## 9. Acessibilidade

- Foco visível (`focus-visible:ring-2 focus-visible:ring-primary`) em todos os interativos.
- Mensagens de erro associadas aos campos via `<span role="alert">`.
- `prefers-reduced-motion` desativa animações.
- Imagens decorativas com `aria-hidden`; imagens funcionais com `<svg role="img" aria-label>` ou `alt` quando aplicável.
- Tabs e selects semânticos; foco gerenciado em dialogs/drawers via Radix.

## 10. Decisões de UX fora do Figma

Como o enunciado pede "Estados não desenhados devem seguir o mesmo padrão visual", registramos aqui pequenas adaptações:

- Adicionamos badge de **RARO** quando `nft.rarity` é `raro` ou superior (presente em alguns frames de detalhe).
- Adicionamos indicador de paginação no hero da home (3 bolinhas), replicando o que aparece nos frames.
- Botão "Ver carrinho" na home é um atalho secundário para tornar a navegação óbvia durante a demo.

## 11. Limitações e dívidas

- A página `/nft/$id` está como placeholder. Implementação completa no Sprint 2.
- Handshake Engine.IO completo do `@mswjs/socket.io-binding` não dispara `connect` no cliente nos testes E2E (limitação documentada em §4). Cobertura do tempo real no carrinho vem do polling + refetch + patch otimista.
- `VITE_ENABLE_MOCKS=true` no build de produção (ver `vercel.json`) — o `mockServiceWorker.js` é servido em `/` com `Cache-Control: max-age=0, must-revalidate` para garantir atualização. Quando houver backend real, basta setar `VITE_ENABLE_MOCKS=false` no build.
- Lighthouse CI configurado em `lighthouserc.cjs` (3 runs, metas perf≥90, a11y/bp≥95, seo≥90) mas **não** integrado ao pipeline — execução local/manual.
- Regressão visual configurada no Playwright (`maxDiffPixels: 200`, `threshold: 0.2`) mas sem baselines versionadas — gerar via `npx playwright test --update-snapshots` em ambiente controlado antes de ativar em CI.
- O real upload de avatar usa SVG inline para evitar dependência de storage; em produção seria S3/Cloudinary.
- O `useUpsertWallet` aceita `id?` no payload; o frontend atual só envia `id` quando edita (label pré-preenchido). Se o usuário editar a label de uma carteira secundária para o mesmo texto da principal, o handler do mock cai no fallback de `label` e atualiza a errada — não há validação de unicidade de label no handler. Mitigação: a UI atual usa labels fixos "Principal" / "Secundária".