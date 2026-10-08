import { http, HttpResponse, delay } from 'msw';
import type { WalletUpsertPayload } from '@/types';
import { ApiErrorMock, createError, listWalletProviders, listWallets, requireUser, upsertWallet } from '../state';

export const walletHandlers = [
  http.get('/api/wallets', async ({ request }) => {
    await delay(100);
    const user = requireUser(request);
    if (!user) return createError(401, 'unauthorized', 'Sessão necessária.');
    return HttpResponse.json({ data: listWallets(user.id) });
  }),

  http.get('/api/wallets/providers', async () => {
    await delay(40);
    return HttpResponse.json({ data: listWalletProviders() });
  }),

  http.post('/api/wallets', async ({ request }) => {
    await delay(160);
    const user = requireUser(request);
    if (!user) return createError(401, 'unauthorized', 'Sessão necessária.');
    const body = (await request.json()) as Record<string, string>;
    const fields: Record<string, string> = {};
    if (!body.label) fields.label = 'obrigatório';
    if (!body.nickname) fields.nickname = 'obrigatório';
    if (!body.address || !/^0x[a-fA-F0-9]{6,}$/.test(body.address)) {
      fields.address = 'endereço 0x inválido';
    }
    if (!body.network) fields.network = 'selecione uma rede';
    if (!body.type) fields.type = 'selecione uma carteira';
    if (Object.keys(fields).length) {
      return createError(400, 'validation_failed', 'Verifique os campos.', fields);
    }
    if (Math.random() < 0.05) {
      throw new ApiErrorMock(500, 'transient', 'Falha ao salvar carteira.');
    }
    const wallet = upsertWallet(user.id, body as unknown as WalletUpsertPayload);
    return HttpResponse.json({ data: wallet });
  }),

  http.delete('/api/wallets/:id', async ({ request }) => {
    await delay(80);
    const user = requireUser(request);
    if (!user) return createError(401, 'unauthorized', 'Sessão necessária.');
    return new HttpResponse(null, { status: 204 });
  }),
];