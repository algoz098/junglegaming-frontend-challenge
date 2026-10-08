import { test, expect, type Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/login');
  await page.locator('#login-email').fill('contato@mail.com');
  await page.locator('#login-password').fill('123456');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL('/');
}

test.describe('Favoritos (CHALLENGE §3.4)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('favoritar e desfavoritar um NFT na página de detalhe', async ({ page }) => {
    await page.goto('/nft/nft-042-0');
    await expect(page.getByRole('heading', { name: /Emerald Ape #042/i })).toBeVisible({ timeout: 15_000 });
    const mainSection = page.locator('section').filter({ hasNotText: 'Mais desta coleção' }).first();
    const favBtn = mainSection.getByRole('button', { name: /Adicionar aos favoritos|Favoritar/i });
    await favBtn.waitFor({ timeout: 15_000 });
    await favBtn.click();
    await expect(mainSection.getByRole('button', { name: /Favoritado|Remover dos favoritos/i })).toBeVisible();
  });

  test('favorito é preservado após refresh', async ({ page }) => {
    await page.goto('/nft/nft-042-0');
    await expect(page.getByRole('heading', { name: /Emerald Ape #042/i })).toBeVisible({ timeout: 15_000 });
    const mainSection = page.locator('section').filter({ hasNotText: 'Mais desta coleção' }).first();
    const favBtn = mainSection.getByRole('button', { name: /Adicionar aos favoritos|Favoritar/i });
    await favBtn.waitFor({ timeout: 15_000 });
    await favBtn.click();
    await expect(mainSection.getByRole('button', { name: /Favoritado|Remover dos favoritos/i })).toBeVisible({ timeout: 8_000 });
    await page.waitForTimeout(300);
    await page.reload();
    await expect(mainSection.getByRole('button', { name: /Favoritado|Remover dos favoritos/i })).toBeVisible({ timeout: 15_000 });
  });
});