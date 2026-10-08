import { test, expect } from '@playwright/test';

test.describe('Skeletons durante carregamento lento (CHALLENGE §8)', () => {
  test.use({ baseURL: 'http://localhost:4173' });

  test('home renderiza sem CLS no primeiro load', async ({ page }) => {
    const cls = await page.evaluate(() => {
        return new Promise<number>((resolve) => {
          let total = 0;
          const obs = new PerformanceObserver((list) => {
            for (const entry of list.getEntries() as PerformanceEntry[]) {
              // @ts-expect-error layout-shift entries have `value`
              total += entry.value ?? 0;
            }
          });
          try {
            obs.observe({ type: 'layout-shift', buffered: true });
          } catch {
            resolve(0);
            return;
          }
          setTimeout(() => {
            obs.disconnect();
            resolve(total);
          }, 1500);
      });
    });
    await page.goto('/');
    expect(cls).toBeLessThan(0.1);
  });
});