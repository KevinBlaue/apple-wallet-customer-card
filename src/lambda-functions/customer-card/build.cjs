const fs = require('node:fs');
const esbuild = require('esbuild');

fs.rmSync('dist', { recursive: true, force: true });

esbuild
  .build({
    entryPoints: ['./src/index.ts'],
    bundle: true,
    external: ['@aws-sdk/*'],
    format: 'cjs',
    outdir: 'dist',
    platform: 'node',
    sourcemap: true,
    target: ['node24'],
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
