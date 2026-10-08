import { test, expect, type Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/login');
  await page.locator('#login-email').fill('contato@mail.com');
  await page.locator('#login-password').fill('123456');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL('/');
}

test.describe('Perfil e carteiras (CHALLENGE §3.8)', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('edição de perfil mantém dados após refresh', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.getByRole('heading', { name: /Perfil do colecionador/i })).toBeVisible({ timeout: 15_000 });
    const profileForm = page.locator('form').filter({ hasText: 'Nome de exibição' });
    await profileForm.getByLabel('Nome de exibição').fill('Sabrina Editada');
    await profileForm.getByRole('button', { name: 'Salvar' }).click();
    await expect(page.getByText(/Perfil atualizado/i)).toBeVisible({ timeout: 8_000 });
    await page.reload();
    await expect(profileForm.getByLabel('Nome de exibição')).toHaveValue(/Sabrina/i);
  });

  test('erros da API de senha atual incorreta são exibidos', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.getByRole('heading', { name: /Perfil do colecionador/i })).toBeVisible({ timeout: 15_000 });
    await page.locator('#currentPassword').fill('errada');
    await page.locator('#newPassword').fill('novasenha1');
    await page.locator('#confirmPassword').fill('novasenha1');
    await page.getByRole('button', { name: /Salvar nova senha/i }).click();
    await expect(page.getByRole('alert').filter({ hasText: /incorreta|inválid/i }).first()).toBeVisible({
      timeout: 8_000,
    });
  });

  test('carteira com endereço inválido exibe erro de campo', async ({ page }) => {
    await page.goto('/wallets');
    await expect(page.getByRole('heading', { name: /Carteira principal/i })).toBeVisible({ timeout: 15_000 });
    await page.getByLabel('Endereço da carteira').first().fill('nao-endereco');
    await page.getByRole('button', { name: /Salvar carteira/i }).first().click();
    await expect(page.getByText(/inválid/i)).toBeVisible({ timeout: 8_000 });
  });
});