#!/usr/bin/env node
import { existsSync, mkdirSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const port = process.env.LIGHTHOUSE_PORT ?? 4173;
const baseUrl = process.env.LIGHTHOUSE_BASE ?? `http://localhost:${port}`;
const outDir = resolve('./lighthouse-reports');
const urls = ['/', '/nft/nft-042-0'];

if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true });
}

const hasLhci = await new Promise((resolveCheck) => {
  const probe = spawn('npx', ['--no-install', 'lhci', '--version'], {
    stdio: 'ignore',
    shell: true,
  });
  probe.on('error', () => resolveCheck(false));
  probe.on('exit', code => resolveCheck(code === 0));
});

if (hasLhci) {
  const child = spawn('npx', ['lhci', 'collect', '--config=./lighthouserc.cjs'], {
    stdio: 'inherit',
    shell: true,
  });
  child.on('exit', (code) => process.exit(code ?? 0));
} else {
  console.error(
    '[lighthouse] @lhci/cli não está instalado. Para auditoria local use Lighthouse Desktop.',
  );
  console.error(
    `[lighthouse] URLs a auditar manualmente: ${urls.map((u) => `${baseUrl}${u}`).join(', ')}`,
  );
  process.exit(1);
}