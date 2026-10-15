import { spawnSync } from 'node:child_process';
import { mkdirSync, openSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'),
  ai = resolve(root, '../aihangout-platform'),
  out = resolve(root, '.local/static-pilot');
mkdirSync(out, { recursive: true });
const steps = [
  ['backend', root + '/backend', [root + '/node_modules/@nestjs/cli/bin/nest.js', 'build']],
  ['frontend', root + '/frontend', [root + '/node_modules/vite/bin/vite.js', 'build']],
  [
    'ai-worker',
    ai,
    [
      ai + '/node_modules/esbuild/bin/esbuild',
      'src/worker.js',
      '--bundle',
      '--format=esm',
      '--outfile=dist/worker.js',
    ],
  ],
  ['ai-frontend', ai + '/frontend', [ai + '/frontend/node_modules/vite/bin/vite.js', 'build']],
];
for (const [name, cwd, args] of steps) {
  const log = openSync(resolve(out, name + '-build.log'), 'w');
  const r = spawnSync(process.execPath, args, {
    cwd,
    windowsHide: true,
    stdio: ['ignore', log, log],
  });
  if (r.status !== 0)
    throw Error(name + ' build failed; see .local/static-pilot/' + name + '-build.log');
  console.log('Built ' + name);
}
