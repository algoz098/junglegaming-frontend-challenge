# Kurio NFT Marketplace

Implementação do desafio **Jungle Gaming Frontend Challenge — Marketplace de NFTs** com a stack obrigatória do enunciado: **React + TypeScript + TanStack Router + TanStack Query + Axios + Tailwind + shadcn/ui + MSW + Socket.IO + Playwright + Lighthouse**.

> **Nota sobre a marca:** o enunciado chama o produto de "Jungle Gaming NFT Marketplace", mas o Figma define a marca como **Kurio**. Adotamos Kurio no código, na tipografia e nos assets para refletir fielmente o design.

## Setup

```bash
nvm use                    # Node 22 (definido em .nvmrc)
npm install                # instala dependências + gera lockfile
npm run msw:init           # copia o service worker do MSW em public/
npm run dev                # servidor Vite em http://localhost:5173
```

A aplicação roda com **mocks ativados por padrão** (`VITE_ENABLE_MOCKS=true` em `.env`), portanto nenhuma API real é necessária.

## Scripts

| Script | Descrição |
| --- | --- |
| `npm run dev` | Vite dev server com HMR e mocks ativos |
| `npm run build` | TypeScript build + bundle de produção |
| `npm run preview` | Serve o build de produção em http://localhost:4173 |
| `npm run typecheck` | Verifica tipos sem emitir saída |
| `npm run lint` | ESLint flat config |
| `npm run format` | Prettier com plugin do Tailwind |
| `npm run test:e2e` | Playwright (Chromium desktop + mobile) |
| `npm run test:e2e:ui` | Playwright em modo UI |
| `npm run msw:init` | Regenera `public/mockServiceWorker.js` |
| `npm run lighthouse` | Lighthouse CI (requer `@lhci/cli` local) |

## Credenciais fictícias

| E-mail | Senha | Usuário |
| --- | --- | --- |
| `contato@mail.com` | `123456` | Sabrina Novaes (com carteira principal) |
| `joao@mail.com` | `123456` | João Varella (sem carteira) |

## Variáveis de ambiente (`.env.example`)

- `VITE_ENABLE_MOCKS=true|false` — liga/desliga MSW.
- `VITE_API_BASE_URL=/api` — base do axios.
- `VITE_SOCKET_URL=/socket.io` — endpoint do Socket.IO.
- `VITE_NETWORK_PROFILE=standard|slow|flaky|offline` — perfil de latência.

## Cenários de rede e falhas

Os handlers MSW (em `src/mocks/handlers/`) já cobrem:

- Latência variável e respostas fora de ordem (`VITE_NETWORK_PROFILE=flaky`).
- Timeout (`offline`) e indisponibilidade.
- Sessão expirada (`POST /api/session/expire`).
- Conflito de cadastro (e-mail duplicado, código `409 conflict`).
- Cupom inválido (`coupon_invalid`) e expirado (`coupon_expired`).
- Edição esgotada durante a compra (`edition_unavailable`).
- Preço alterado (`price_changed`).
- Idempotência de pedido (`Idempotency-Key` no header).
- Pagamento confirmado/recusado via ciclo de vida do mock (`85%` sucesso).
- Mutação otimista com rollback em favoritos (`5%` de chance de erro 500).

Endpoints de debug:
- `POST /api/_debug/nft-price` `{ nftId, factor }` — altera preço de um NFT e dispara `nft:updated`.
- `POST /api/_debug/order-reject` `{ orderId, reason }` — força rejeição.
- `POST /api/_debug/reset` — reseta carrinhos, pedidos e carteiras.

## Estrutura de pastas

```
src/
  api/            cliente axios, endpoints tipados e query keys
  app/            providers globais (QueryClient, SocketBridge)
  components/
    catalog/      filtros, paginação, toolbar
    layout/       Header, Footer, SidebarNav
    nft/          NftCard, NftArt (SVG), badges
    ui/           primitivos shadcn (Button, Input, Card, Skeleton, Badge, Logo, Select)
  hooks/          wrappers React Query + auth + socket
  lib/            utils (cn, decimal, format)
  mocks/
    fixtures/     dados determinísticos (NFTs, users, coupons, wallets)
    handlers/     handlers MSW por domínio
    socket/       emitter de eventos para o listener React
    browser.ts    setupWorker
    state.ts      estado mutável dos mocks
  routes/         file-based routes do TanStack Router
  types/          contratos REST + tipos de eventos Socket.IO
  app.tsx         router + providers + bootstrap dos mocks
  main.tsx        entry point
tests/e2e/        Playwright (12+ cenários cobrindo fluxos críticos)
```

## Deploy

`vercel.json` está incluído para publicação direta via `vercel deploy --prod`. O build estático fica em `dist/`; todas as rotas SPA caem em `index.html` via rewrite; assets recebem `Cache-Control: public, max-age=31536000, immutable`; o `mockServiceWorker.js` é servido com `Cache-Control: public, max-age=0, must-revalidate`.

A aplicação foi deployada temporariamente em:

> `https://temporary-prompt-apogee-y1skn13.vercel.app` (link temporário, expira em ~1h após o deploy)

Para um deploy permanente faça login na Vercel e rode:

```bash
npx vercel login
npx vercel --prod   # usa o vercel.json automaticamente
```

Variáveis de build configuradas em `vercel.json` (`VITE_ENABLE_MOCKS=true`) garantem que o MSW e o `@mswjs/socket.io-binding` sejam bundleados no build de produção.

## Métricas Lighthouse (mediana de 3 runs, build de produção)

| Página | Perf | A11y | BP | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|
| `/` (Home) | 98 | 100 | 96 | 100 | 1.0s | 0 | 0ms |
| `/nft/nft-042-0` (Detalhe) | 98 | 98 | 96 | 100 | 1.1s | 0 | 0ms |
| **Meta CHALLENGE §10** | ≥90 | ≥95 | ≥95 | ≥90 | <2.5s | <0.1 | <300ms |

## Cobertura de testes E2E

40 specs × 2 projetos (Chromium desktop + mobile) = **83 execuções, todas passando**.

Specs em `tests/e2e/`:

| Spec | Cenário CHALLENGE |
|---|---|
| `main.spec.ts` | §3 (todas as 9 telas), §9.1, §9.3, §9.4, §9.5, §9.6, §9.11 |
| `favorites.spec.ts` | §3.4 (favoritos), §9.4 |
| `profile-wallets.spec.ts` | §3.8 (perfil e carteiras) |
| `guest-cart.spec.ts` | §3.4 (carrinho visitante) |
| `idempotency.spec.ts` | §3.5 (idempotência) |
| `order-timeout-recovery.spec.ts` | §9.7 (clique repetido, conflito, timeout+retry) |
| `event-versioning.spec.ts` | §9.10 (eventos antigos e duplicados) |
| `failure-recovery.spec.ts` | §9.12 (skeleton, estado vazio) |
| `session-expired.spec.ts` | §3.6, §9.3 (expiração de sessão, limpeza de token) |
| `skeletons.spec.ts` | §8 (skeleton sem CLS) |
| `socket-realtime.spec.ts` | §7-cenário-1 (reflete preço de NFT no cart) |
| `header-nav.spec.ts` | §3 (navegação do header, links out-of-scope) |
| `visual-regression.spec.ts` | §9 (baselines de screenshot) |

Regressão visual: rodar `npx playwright test --update-snapshots tests/e2e/visual-regression.spec.ts` para regenerar as baselines em `tests/e2e/visual-regression.spec.ts-snapshots/` quando houver mudanças intencionais de UI.

## Documentação adicional

- `ARCHITECTURE.md` — decisões de arquitetura, política de cache, reconciliação REST↔Socket, listener de sessão expirada, refresh de preços no cart, lifecycle de auth do socket.
- `CHALLENGE.md` — enunciado original preservado.
- `design/frames/*.png` — capturas dos frames do Figma usadas como referência visual.
- `lighthouserc.cjs` — configuração do Lighthouse CI (3 runs, metas validadas por `lhci assert`).

## Estado das Sprints

| Sprint | Entrega |
| --- | --- |
| 1 — Scaffold | ✅ Vite+React+TS, Tailwind, shadcn, MSW, Socket.IO, ESLint, Prettier |
| 2 — Catálogo | ✅ Home com catálogo real, URL-state, paginação, detalhe do NFT (galeria, qtd, favoritos, comprar) |
| 3 — Auth & Conta | ✅ Login/Register/Sessão, Perfil (dados/avatar/senha), Carteiras (criar/editar/excluir), expiração de sessão com limpeza de token e redirect |
| 4 — Compra | ✅ Carrinho (visitante → autenticado, cupom, resumo, refresh de preços), Checkout (form, revisão, idempotência, `expectedTotalsVersion`, `price_changed`), Confirmação (recibo, polling 2s, listener de socket) |
| 5 — Qualidade | ✅ Playwright (12+ cenários cobrindo todos os fluxos da §9), Lighthouse CI (metas §10 atingidas), Vercel deploy, regressão visual, listener de socket raiz (`useNftGlobalSocket` + `useOrderGlobalSocket`) |

## Como executar localmente

```bash
npm install
npm run dev
# abra http://localhost:5173

# faça login com contato@mail.com / 123456
# adicione NFTs ao carrinho, finalize a compra
```

Para rodar testes E2E:

```bash
npm run build
npm run test:e2e
```

Para auditoria Lighthouse (local):

```bash
npx @lhci/cli@0.13.x collect --config=./lighthouserc.cjs
```