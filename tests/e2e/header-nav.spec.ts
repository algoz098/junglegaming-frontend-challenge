import { test, expect } from '@playwright/test';

test.describe('Header — navegação principal', () => {
  test('"Início" navega para / sem query e fica ativo', async ({ page }) => {
    await page.goto('/?sort=trending');
    const link = page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', { name: 'Início' });
    await link.click();
    await expect(page).toHaveURL(/\/\?$|\/$/);
    await expect(link).toHaveAttribute('aria-current', 'page');
  });

  test('"Mercado" navega para /?sort=trending e fica ativo', async ({ page }) => {
    await page.goto('/');
    const link = page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', { name: 'Mercado' });
    await link.click();
    await expect(page).toHaveURL(/sort=trending/);
    await expect(link).toHaveAttribute('aria-current', 'page');
  });

  test('"Início" não está ativo quando Mercado está ativo, e vice-versa', async ({ page }) => {
    page.on('console', (msg) => {
      if (msg.text().includes('header-render') || msg.text().includes('header-debug')) {
        console.log('[browser]', msg.text());
      }
    });
    await page.goto('/?sort=trending');
    await page.waitForTimeout(1000);
    const inicio = page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', { name: 'Início' });
    const mercado = page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', { name: 'Mercado' });
    await expect(mercado).toHaveAttribute('aria-current', 'page');
    await expect(inicio).not.toHaveAttribute('aria-current', 'page');

    await inicio.click();
    await expect(inicio).toHaveAttribute('aria-current', 'page');
    await expect(mercado).not.toHaveAttribute('aria-current', 'page');
  });

  test('"Criadores" mostra toast "em breve" e não navega', async ({ page }) => {
    await page.goto('/');
    const urlBefore = page.url();
    const link = page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('button', { name: 'Criadores' });
    await link.click();
    await expect(page.getByText(/Página de criadores em breve/i)).toBeVisible({ timeout: 4_000 });
    expect(page.url()).toBe(urlBefore);
  });

  test('"Aprenda" mostra toast "em breve" e não navega', async ({ page }) => {
    await page.goto('/');
    const urlBefore = page.url();
    const link = page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('button', { name: 'Aprenda' });
    await link.click();
    await expect(page.getByText(/Central educativa em breve/i)).toBeVisible({ timeout: 4_000 });
    expect(page.url()).toBe(urlBefore);
  });
});
