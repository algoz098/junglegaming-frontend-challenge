import { test, expect } from '@playwright/test';

test.describe('Carrinho visitante (CHALLENGE §3.4)', () => {
  test('visitante adiciona NFT, vê carrinho local com nome do NFT e preserva após login', async ({
    page,
  }) => {
    await page.goto('/nft/nft-042-0');
    await page.getByRole('button', { name: /Comprar NFT|Adicionar ao carrinho/i }).click();
    await page.waitForTimeout(500);
    await page.goto('/cart');
    await expect(page.getByText(/salvo(?:s)? como visitante/i).first()).toBeVisible();
    await expect(page.getByText('Emerald Ape #042').first()).toBeVisible();

    await page.goto('/login');
    await page.locator('#login-email').fill('contato@mail.com');
    await page.locator('#login-password').fill('123456');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await page.waitForURL('/');

    await page.goto('/cart');
    await expect(page.getByText('Emerald Ape #042').first()).toBeVisible();
  });
});
