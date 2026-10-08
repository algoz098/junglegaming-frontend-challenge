import { test, expect, type Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/login');
  await page.locator('#login-email').fill('contato@mail.com');
  await page.locator('#login-password').fill('123456');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL('/');
}

test.describe('Expiração de sessão (CHALLENGE §3.6 e §9.3)', () => {
  test('POST /api/session/expire derruba sessão e redireciona ao navegar para rota privada', async ({
    page,
  }) => {
    await login(page);

    await page.evaluate(async () => {
      const token = window.localStorage.getItem('kurio.session.token');
      await fetch('/api/session/expire', {
        method: 'POST',
        headers: token ? { authorization: `Bearer ${token}` } : {},
      });
    });

    await page.goto('/profile');
    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
    await expect(page).toHaveURL(/redirect=%2Fprofile/);
  });

  test('token em localStorage é removido após 401', async ({ page }) => {
    await login(page);
    const tokenBefore = await page.evaluate(() =>
      window.localStorage.getItem('kurio.session.token'),
    );
    expect(tokenBefore).toBeTruthy();

    await page.evaluate(async () => {
      const token = window.localStorage.getItem('kurio.session.token');
      await fetch('/api/session/expire', {
        method: 'POST',
        headers: token ? { authorization: `Bearer ${token}` } : {},
      });
    });

    await page.evaluate(async () => {
      await fetch('/api/profile', {
        headers: {
          authorization: `Bearer ${
            window.localStorage.getItem('kurio.session.token') ?? 'expired'
          }`,
        },
      });
    });

    await page.waitForTimeout(400);
    const tokenAfter = await page.evaluate(() =>
      window.localStorage.getItem('kurio.session.token'),
    );
    expect(tokenAfter).toBeNull();
  });
});
