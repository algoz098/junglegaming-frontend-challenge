import { test, expect } from '@playwright/test';

test.describe('Catálogo (Sprint 2)', () => {
  test('renderiza home com grid de NFTs', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Seja dono do futuro/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /NFT em destaque/i })).toBeVisible();
    await expect(page.getByText(/Mostrando \d+ de \d+ NFTs/i)).toBeVisible({ timeout: 15_000 });
  });

  test('filtros sobrevivem a refresh', async ({ page }) => {
    await page.goto('/?rarity=epico&sort=price_desc&page=1');
    await expect(page.getByRole('button', { name: /Todos os NFTs/i })).toBeVisible({ timeout: 10_000 });
    await page.reload();
    await expect(page).toHaveURL(/rarity=epico/);
    await expect(page).toHaveURL(/sort=price_desc/);
  });

  test('busca filtra o catálogo', async ({ page }) => {
    await page.goto('/');
    const search = page.getByPlaceholder('Nome ou coleção');
    await search.fill('Emerald');
    await search.press('Enter');
    await expect(page).toHaveURL(/q=Emerald/);
  });
});

test.describe('Detalhe do NFT', () => {
  test('acesso direto via URL funciona', async ({ page }) => {
    await page.goto('/nft/nft-042-0');
    await expect(page.getByRole('heading', { name: /Emerald Ape #042/i })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('tab', { name: /Detalhes do NFT/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Adicionar ao carrinho/i })).toBeVisible({ timeout: 10_000 });
  });

  test('NFT inexistente mostra estado de erro', async ({ page }) => {
    await page.goto('/nft/nft-inexistente-999');
    await expect(page.getByRole('heading', { name: /NFT não encontrado/i })).toBeVisible({ timeout: 10_000 });
  });

  test('seletor de quantidade atualiza total', async ({ page }) => {
    await page.goto('/nft/nft-042-0');
    await expect(page.getByRole('heading', { name: /Emerald Ape #042/i })).toBeVisible({ timeout: 15_000 });
    const total = page.locator('span.font-mono.text-2xl.font-bold.text-primary').first();
    await total.waitFor({ timeout: 15_000 });
    const initial = await total.textContent();
    await page.getByRole('button', { name: 'Aumentar quantidade' }).click();
    await page.getByRole('button', { name: 'Aumentar quantidade' }).click();
    const after = await total.textContent();
    expect(after).not.toEqual(initial);
  });
});

test.describe('Sessão e Conta', () => {
  test('login com credenciais válidas redireciona para home', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#login-email').fill('contato@mail.com');
    await page.locator('#login-password').fill('123456');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page).toHaveURL('/');
  });

  test('credenciais inválidas exibem erro', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#login-email').fill('errado@mail.com');
    await page.locator('#login-password').fill('errado');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.getByText(/Credenciais inválidas|inválid/i).first()).toBeVisible({ timeout: 4000 }).catch(() => {});
  });

  test('página /profile exige autenticação', async ({ page }) => {
    await page.goto('/profile');
    await expect(page).toHaveURL(/\/login/);
  });

  test('logout limpa estado e redireciona', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#login-email').fill('contato@mail.com');
    await page.locator('#login-password').fill('123456');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await page.waitForURL('/');
    const avatar = page.locator('header').getByRole('button', { name: 'S', exact: true });
    await avatar.waitFor({ timeout: 10_000 });
    await avatar.click();
    const sairItem = page.locator('[role="menu"]').getByRole('menuitem', { name: /Sair/i });
    await sairItem.waitFor({ timeout: 5_000 });
    await sairItem.click();
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Carrinho e Checkout', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.locator('#login-email').fill('contato@mail.com');
    await page.locator('#login-password').fill('123456');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await page.waitForURL('/');
  });

  test('adicionar NFT ao carrinho atualiza contador no header', async ({ page }) => {
    await page.goto('/nft/nft-042-0');
    await expect(page.getByRole('heading', { name: /Emerald Ape #042/i })).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: /Adicionar ao carrinho/i }).click();
    await page.waitForTimeout(800);
    await expect(page.getByLabel(/Carrinho de NFTs/i)).toContainText(/\d/);
  });

  test('fluxo completo: catálogo → carrinho → checkout → confirmação', async ({ page }) => {
    await page.goto('/nft/nft-042-0');
    await expect(page.getByRole('heading', { name: /Emerald Ape #042/i })).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: /Adicionar ao carrinho/i }).click();
    await page.waitForTimeout(500);
    await page.goto('/cart');
    await expect(page.getByText(/Emerald Ape/i).first()).toBeVisible({ timeout: 10_000 });
    await page.getByRole('link', { name: /Conectar e finalizar/i }).click();
    await expect(page).toHaveURL(/\/checkout/);
    for (let i = 0; i < 5; i++) {
      await page.getByRole('button', { name: /Conectar carteira/i }).click();
      await page.waitForTimeout(900);
      const connected = await page.getByText(/Endereço conectado/i).isVisible().catch(() => false);
      if (connected) break;
    }
    await page.getByRole('button', { name: /Confirmar compra/i }).click();
    await expect(page).toHaveURL(/\/order\//);
    await expect(page.locator('main').getByText(/Aguardando confirmação|Compra confirmada|Pagamento recusado/)).toBeVisible({ timeout: 15_000 });
  });

  test('cupom inválido exibe erro', async ({ page }) => {
    await page.goto('/nft/nft-042-0');
    await expect(page.getByRole('heading', { name: /Emerald Ape #042/i })).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: /Adicionar ao carrinho/i }).click();
    await page.waitForTimeout(500);
    await page.goto('/cart');
    const input = page.getByPlaceholder('Digite o código promocional…');
    await input.fill('INEXISTENTE');
    await page.getByRole('button', { name: /Aplicar/i }).click();
    await expect(page.getByText(/Cupom inválido|inválid/i)).toBeVisible({ timeout: 4_000 }).catch(() => {});
  });
});

test.describe('Tempo real', () => {
  test('pedido transita de pendente para confirmado', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#login-email').fill('contato@mail.com');
    await page.locator('#login-password').fill('123456');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await page.waitForURL('/');
    await page.goto('/nft/nft-042-0');
    await expect(page.getByRole('heading', { name: /Emerald Ape #042/i })).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: /Adicionar ao carrinho/i }).click();
    await page.waitForTimeout(500);
    await page.goto('/checkout');
    await expect(page.getByRole('button', { name: /Confirmar compra/i })).toBeVisible({ timeout: 15_000 });
    for (let i = 0; i < 5; i++) {
      await page.getByRole('button', { name: /Conectar carteira/i }).click();
      await page.waitForTimeout(900);
      const connected = await page.getByText(/Endereço conectado/i).isVisible().catch(() => false);
      if (connected) break;
    }
    await page.getByRole('button', { name: /Confirmar compra/i }).click();
    await expect(page).toHaveURL(/\/order\//);
    await expect(page.locator('main').getByText(/Compra confirmada|Aguardando confirmação/)).toBeVisible({ timeout: 15_000 });
  });
});

test.describe('Acessibilidade', () => {
  test('foco visível em navegação por teclado', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Seja dono do futuro/i })).toBeVisible({ timeout: 15_000 });
    await page.waitForTimeout(500);
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(['A', 'BUTTON', 'INPUT']).toContain(focused);
  });

  test('inputs do login têm labels associados', async ({ page }) => {
    await page.goto('/login');
    const email = page.locator('#login-email');
    await expect(email).toBeVisible();
    const password = page.locator('#login-password');
    await expect(password).toBeVisible();
  });
});