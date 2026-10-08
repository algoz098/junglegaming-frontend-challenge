import { test, expect } from '@playwright/test';

test.describe('Feedback de falha e recuperação (CHALLENGE §9.12)', () => {
  test('skeleton aparece durante carregamento lento do catálogo', async ({ page }) => {
    // Garante que o service worker está registrado antes de injetar o delay.
    await page.goto('/');
    await page.evaluate(async () => {
      await fetch('/api/_debug/nfts-delay-next', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ delayMs: 4000 }),
      });
    });
    // Dispara nova requisição (muda parâmetro de busca) que consome o delay injetado.
    await page.goto('/?retry=skeleton');
    // O skeleton tem aria-busy="true" enquanto a query está loading.
    await expect(page.locator('[aria-busy="true"]').first()).toBeVisible({ timeout: 2_000 });
  });
});

test.describe('Estado vazio (CHALLENGE §4 e §9)', () => {
  test('busca sem resultados mostra estado vazio', async ({ page }) => {
    await page.goto('/?q=xyzzznevermatch');
    await expect(page.getByText(/Nenhum NFT encontrado/i)).toBeVisible({ timeout: 10_000 });
  });

  test('busca por id inexistente mostra estado vazio no detalhe', async ({ page }) => {
    await page.goto('/nft/nft-nao-existe-12345');
    await expect(page.getByText(/NFT não encontrado/i)).toBeVisible({ timeout: 10_000 });
  });
});
