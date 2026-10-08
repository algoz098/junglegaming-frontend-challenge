import { test, expect, type Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/login');
  await page.locator('#login-email').fill('contato@mail.com');
  await page.locator('#login-password').fill('123456');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL('/');
}

test.describe('Tempo real durante checkout (CHALLENGE §7-cenário-1)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('alterar preço de NFT reflete no cart do servidor após refetch', async ({ page }) => {
    await page.goto('/nft/nft-042-0');
    await expect(page.getByRole('heading', { name: /Emerald Ape #042/i })).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: /Adicionar ao carrinho/i }).click();
    await page.waitForTimeout(500);

    const before = await page.evaluate(async () => {
      const token = window.localStorage.getItem('kurio.session.token');
      const res = await fetch('/api/cart', {
        headers: token ? { authorization: `Bearer ${token}` } : {},
      });
      const json = (await res.json()) as { data?: { items?: Array<{ priceSnapshot: { amount: string } }> } };
      return json.data?.items?.[0]?.priceSnapshot?.amount ?? '';
    });

    const debugStatus = await page.evaluate(async () => {
      const res = await fetch('/api/_debug/nft-price', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ nftId: 'nft-042-0', factor: 1.5 }),
      });
      return res.status;
    });
    expect(debugStatus).toBe(204);

    const after = await page.evaluate(async () => {
      const token = window.localStorage.getItem('kurio.session.token');
      const res = await fetch('/api/cart', {
        headers: token ? { authorization: `Bearer ${token}` } : {},
      });
      const json = (await res.json()) as { data?: { items?: Array<{ priceSnapshot: { amount: string } }> } };
      return json.data?.items?.[0]?.priceSnapshot?.amount ?? '';
    });

    expect(after).not.toEqual(before);
    expect(Number(after)).toBeGreaterThan(Number(before));
  });

  test('infraestrutura de socket está ativa (WebSocketInterceptor conectado)', async ({ page }) => {
    const ready = await page.evaluate(
      () => (window as unknown as { __KURIO_SOCKET_READY__?: boolean }).__KURIO_SOCKET_READY__,
    );
    expect(ready).toBe(true);
  });
});
