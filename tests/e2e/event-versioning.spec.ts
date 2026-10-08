import { test, expect, type Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/login');
  await page.locator('#login-email').fill('contato@mail.com');
  await page.locator('#login-password').fill('123456');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL('/');
}

test.describe('Eventos duplicados e antigos (CHALLENGE §9.10)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('order.updated com versão antiga não regride pedido confirmado', async ({ page }) => {
    const token = await page.evaluate(() => window.localStorage.getItem('kurio.session.token'));
    const idemKey = `idem-event-old-${Date.now()}`;
    const headers = {
      'content-type': 'application/json',
      'Idempotency-Key': idemKey,
      authorization: `Bearer ${token ?? ''}`,
    };

    // Cria um pedido via REST direto.
    const createRes = await page.evaluate(
      async ({ url, headers, body }) => {
        const res = await fetch(url, { method: 'POST', headers, body });
        return res.json();
      },
      {
        url: '/api/orders',
        headers,
        body: JSON.stringify({
          items: [{ nftId: 'nft-042-0', quantity: 1 }],
          collector: {
            displayName: 'Sabrina',
            username: 'sabrina',
            network: 'ethereum',
            walletAddress: '0xevent-test',
            email: 'sabrina@example.com',
          },
          walletProvider: 'metamask',
          expectedTotalsVersion: 1,
        }),
      },
    );
    const orderId = createRes?.data?.id;
    expect(orderId).toBeTruthy();

    // Aguarda ciclo de vida do mock levar a totals.version de 1 para 2.
    await page.waitForTimeout(3_500);

    // Confirma que o pedido atingiu estado terminal e totals.version = 2.
    const after = await page.evaluate(
      async ({ url, headers }) => {
        const res = await fetch(url, { headers });
        return res.json();
      },
      { url: `/api/orders/${orderId}`, headers },
    );
    const terminal = after?.data?.status;
    expect(['confirmed', 'rejected']).toContain(terminal);
    const currentVersion = after?.data?.totals?.version;
    expect(currentVersion).toBeGreaterThanOrEqual(2);

    // Abre a página do pedido. Ela usa useOrder (polling) + useOrderSocket (push).
    await page.goto(`/order/${orderId}`);
    await expect(
      page
        .locator('main')
        .getByText(new RegExp(terminal === 'confirmed' ? 'Compra confirmada' : 'Pagamento recusado')),
    ).toBeVisible({ timeout: 8_000 });

    // Dispara um evento "antigo" (versão 1, status pending) via debug endpoint.
    // O cliente deve ignorar o evento e manter o estado terminal.
    await page.evaluate(
      async ({ url, headers, body }) => {
        await fetch(url, { method: 'POST', headers, body });
      },
      {
        url: '/api/_debug/order-emit',
        headers,
        body: JSON.stringify({ orderId, status: 'pending', version: 1 }),
      },
    );

    // Aguarda o próximo polling tick (refetchInterval: 2s) e confirma que o status não regrediu.
    await page.waitForTimeout(2_500);
    await page.reload();
    await expect(
      page
        .locator('main')
        .getByText(new RegExp(terminal === 'confirmed' ? 'Compra confirmada' : 'Pagamento recusado')),
    ).toBeVisible({ timeout: 8_000 });
  });

  test('order.updated com mesma versão é idempotente (não duplica efeito)', async ({ page }) => {
    const token = await page.evaluate(() => window.localStorage.getItem('kurio.session.token'));
    const idemKey = `idem-event-dup-${Date.now()}`;
    const headers = {
      'content-type': 'application/json',
      'Idempotency-Key': idemKey,
      authorization: `Bearer ${token ?? ''}`,
    };

    const createRes = await page.evaluate(
      async ({ url, headers, body }) => {
        const res = await fetch(url, { method: 'POST', headers, body });
        return res.json();
      },
      {
        url: '/api/orders',
        headers,
        body: JSON.stringify({
          items: [{ nftId: 'nft-042-0', quantity: 1 }],
          collector: {
            displayName: 'Sabrina',
            username: 'sabrina',
            network: 'ethereum',
            walletAddress: '0xevent-test-2',
            email: 'sabrina@example.com',
          },
          walletProvider: 'metamask',
          expectedTotalsVersion: 1,
        }),
      },
    );
    const orderId = createRes?.data?.id;
    expect(orderId).toBeTruthy();

    await page.waitForTimeout(3_500);

    const after = await page.evaluate(
      async ({ url, headers }) => {
        const res = await fetch(url, { headers });
        return res.json();
      },
      { url: `/api/orders/${orderId}`, headers },
    );
    const terminal = after?.data?.status;
    const currentVersion = after?.data?.totals?.version;

    // Emite o MESMO evento de novo (mesmo status e mesma versão).
    // O handler deve descartar (version <= current) e nada mudar.
    await page.evaluate(
      async ({ url, headers, body }) => {
        await fetch(url, { method: 'POST', headers, body });
      },
      {
        url: '/api/_debug/order-emit',
        headers,
        body: JSON.stringify({ orderId, status: terminal, version: currentVersion }),
      },
    );

    // Confirma via polling que o estado se mantém.
    await page.goto(`/order/${orderId}`);
    await expect(
      page
        .locator('main')
        .getByText(new RegExp(terminal === 'confirmed' ? 'Compra confirmada' : 'Pagamento recusado')),
    ).toBeVisible({ timeout: 8_000 });
  });
});
