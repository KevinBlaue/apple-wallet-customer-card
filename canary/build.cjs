const fs = require('node:fs');
const esbuild = require('esbuild');

fs.rmSync('dist', { recursive: true, force: true });

esbuild
  .build({
    entryPoints: ['./src/index.ts'],
    bundle: true,
    platform: 'node',
    target: ['node24'],
    outdir: 'dist/nodejs/node_modules/canary',
    external: ['Synthetics', 'SyntheticsLogger'],
  })
  .catch(() => {
    process.exitCode = 1;
  });
