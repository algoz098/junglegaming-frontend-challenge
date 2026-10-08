import { test, expect, type Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/login');
  await page.locator('#login-email').fill('contato@mail.com');
  await page.locator('#login-password').fill('123456');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL('/');
}

test.describe('Idempotência e timeout de pedido (CHALLENGE §9.7)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('clique repetido com mesma Idempotency-Key não duplica pedido', async ({ page }) => {
    const idemKey = `idem-repeat-${Date.now()}`;
    const payload = {
      items: [{ nftId: 'nft-042-0', quantity: 1 }],
      collector: {
        displayName: 'Sabrina',
        username: 'sabrina',
        network: 'ethereum',
        walletAddress: '0xrepeat',
        email: 'sabrina@example.com',
      },
      walletProvider: 'metamask',
      expectedTotalsVersion: 1,
    };

    const first = await page.evaluate(
      async ({ url, headers, body }) => {
        const res = await fetch(url, { method: 'POST', headers, body });
        return { status: res.status, body: (await res.json()).data?.id ?? null };
      },
      {
        url: '/api/orders',
        headers: {
          'content-type': 'application/json',
          'Idempotency-Key': idemKey,
          authorization: `Bearer ${await page.evaluate(() => window.localStorage.getItem('kurio.session.token')) ?? ''}`,
        },
        body: JSON.stringify(payload),
      },
    );

    for (let i = 0; i < 3; i++) {
      const again = await page.evaluate(
        async ({ url, headers, body }) => {
          const res = await fetch(url, { method: 'POST', headers, body });
          return { status: res.status, body: (await res.json()).data?.id ?? null };
        },
        {
          url: '/api/orders',
          headers: {
            'content-type': 'application/json',
            'Idempotency-Key': idemKey,
            authorization: `Bearer ${await page.evaluate(() => window.localStorage.getItem('kurio.session.token')) ?? ''}`,
          },
          body: JSON.stringify(payload),
        },
      );
      expect(again.body).toBe(first.body);
    }
  });

  test('Idempotency-Key reusada com payload diferente retorna 409 idempotency_conflict', async ({
    page,
  }) => {
    const idemKey = `idem-conflict-${Date.now()}`;
    const basePayload = {
      collector: {
        displayName: 'Sabrina',
        username: 'sabrina',
        network: 'ethereum',
        walletAddress: '0xconflict',
        email: 'sabrina@example.com',
      },
      walletProvider: 'metamask',
      expectedTotalsVersion: 1,
    };

    const first = await page.evaluate(
      async ({ url, headers, body }) => {
        const res = await fetch(url, { method: 'POST', headers, body });
        return { status: res.status, body: await res.json() };
      },
      {
        url: '/api/orders',
        headers: {
          'content-type': 'application/json',
          'Idempotency-Key': idemKey,
          authorization: `Bearer ${await page.evaluate(() => window.localStorage.getItem('kurio.session.token')) ?? ''}`,
        },
        body: JSON.stringify({ ...basePayload, items: [{ nftId: 'nft-042-0', quantity: 1 }] }),
      },
    );
    expect(first.status).toBe(200);

    const second = await page.evaluate(
      async ({ url, headers, body }) => {
        const res = await fetch(url, { method: 'POST', headers, body });
        return { status: res.status, body: await res.json() };
      },
      {
        url: '/api/orders',
        headers: {
          'content-type': 'application/json',
          'Idempotency-Key': idemKey,
          authorization: `Bearer ${await page.evaluate(() => window.localStorage.getItem('kurio.session.token')) ?? ''}`,
        },
        body: JSON.stringify({ ...basePayload, items: [{ nftId: 'nft-042-0', quantity: 2 }] }),
      },
    );
    expect(second.status).toBe(409);
    expect(second.body?.error?.code).toBe('idempotency_conflict');
  });

  test('timeout no POST + retry com mesma Idempotency-Key recupera o mesmo pedido (terminal)', async ({
    page,
  }) => {
    const idemKey = `idem-timeout-${Date.now()}`;
    const token = await page.evaluate(() => window.localStorage.getItem('kurio.session.token'));
    const payload = {
      items: [{ nftId: 'nft-042-0', quantity: 1 }],
      collector: {
        displayName: 'Sabrina',
        username: 'sabrina',
        network: 'ethereum',
        walletAddress: '0xtimeout',
        email: 'sabrina@example.com',
      },
      walletProvider: 'metamask',
      expectedTotalsVersion: 1,
    };

    // Primeira tentativa: aborta antes da resposta do servidor (simula timeout de rede do cliente).
    // O servidor já processou a requisição e criou o pedido; o cliente perdeu a resposta.
    const firstResult = await page.evaluate(
      async ({ url, headers, body }) => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 50);
        try {
          const res = await fetch(url, { method: 'POST', headers, body, signal: controller.signal });
          clearTimeout(timeoutId);
          return { status: res.status, body: await res.json() };
        } catch (err) {
          clearTimeout(timeoutId);
          return { status: 0, body: null, error: (err as Error).name };
        }
      },
      {
        url: '/api/orders',
        headers: {
          'content-type': 'application/json',
          'Idempotency-Key': idemKey,
          authorization: `Bearer ${token ?? ''}`,
        },
        body: JSON.stringify(payload),
      },
    );
    expect(firstResult.error).toBe('AbortError');

    // Aguarda o ciclo de vida do mock (~3s) levar o pedido a um estado terminal.
    await page.waitForTimeout(3_500);

    // Retry: mesma Idempotency-Key, mesma payload → deve devolver o mesmo pedido, agora terminal.
    const retry = await page.evaluate(
      async ({ url, headers, body }) => {
        const res = await fetch(url, { method: 'POST', headers, body });
        return { status: res.status, body: await res.json() };
      },
      {
        url: '/api/orders',
        headers: {
          'content-type': 'application/json',
          'Idempotency-Key': idemKey,
          authorization: `Bearer ${token ?? ''}`,
        },
        body: JSON.stringify(payload),
      },
    );
    expect(retry.status).toBe(200);
    expect(['confirmed', 'rejected']).toContain(retry.body?.data?.status);
  });
});
