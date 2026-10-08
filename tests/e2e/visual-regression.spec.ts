import { test, expect, type Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/login');
  await page.locator('#login-email').fill('contato@mail.com');
  await page.locator('#login-password').fill('123456');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL('/');
}

test.describe('Regressão visual (CHALLENGE §9)', () => {
  test('home (catálogo) — desktop', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/Mostrando \d+ de \d+ NFTs/i)).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveScreenshot('home-desktop.png', { fullPage: true, maxDiffPixelRatio: 0.02 });
  });

  test('detalhe do NFT — desktop', async ({ page }) => {
    await page.goto('/nft/nft-042-0');
    await expect(page.getByRole('heading', { name: /Emerald Ape #042/i })).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveScreenshot('nft-detail-desktop.png', { fullPage: true, maxDiffPixelRatio: 0.02 });
  });

  test('carrinho autenticado — desktop', async ({ page }) => {
    await login(page);
    await page.goto('/nft/nft-042-0');
    await expect(page.getByRole('heading', { name: /Emerald Ape #042/i })).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: /Adicionar ao carrinho/i }).click();
    await page.waitForTimeout(500);
    await page.goto('/cart');
    await expect(page.getByText(/Emerald Ape/i).first()).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveScreenshot('cart-desktop.png', { fullPage: true, maxDiffPixelRatio: 0.02 });
  });

  test('login — desktop', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
    await expect(page).toHaveScreenshot('login-desktop.png', { fullPage: true, maxDiffPixelRatio: 0.02 });
  });
});
