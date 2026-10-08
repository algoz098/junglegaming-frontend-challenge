import { test, expect } from '@playwright/test';

test.describe('Idempotência de pedido (CHALLENGE §3.5)', () => {
  test('mesma Idempotency-Key + mesmo payload retorna o mesmo pedido', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#login-email').fill('contato@mail.com');
    await page.locator('#login-password').fill('123456');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await page.waitForURL('/');

    const nftRes = await page.evaluate(async () => {
      const res = await fetch('/api/nfts/nft-042-0');
      return res.json();
    });
    const expectedTotalsVersion = nftRes?.data?.price?.version ?? 1;

    const idemKey = `idem-test-${Date.now()}`;
    const payload = {
      items: [{ nftId: 'nft-042-0', quantity: 1 }],
      couponCode: undefined,
      collector: {
        displayName: 'Sabrina',
        username: 'sabrina',
        network: 'ethereum',
        walletAddress: '0xtest123',
        email: 'sabrina@example.com',
      },
      walletProvider: 'metamask',
      expectedTotalsVersion,
    };

    const token = await page.evaluate(() =>
      window.localStorage.getItem('kurio.session.token'),
    );
    const first = await page.evaluate(
      async ({ url, headers, body }) => {
        const res = await fetch(url, { method: 'POST', headers, body });
        const text = await res.text();
        return { status: res.status, body: text ? JSON.parse(text) : null };
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
    const second = await page.evaluate(
      async ({ url, headers, body }) => {
        const res = await fetch(url, { method: 'POST', headers, body });
        const text = await res.text();
        return { status: res.status, body: text ? JSON.parse(text) : null };
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
    expect(first.body?.data?.id ?? first.body?.error).toBeDefined();
    if (first.body?.data?.id) {
      expect(first.body.data.id).toEqual(second.body.data.id);
    } else {
      throw new Error(`first.body=${JSON.stringify(first.body)}`);
    }
  });
});