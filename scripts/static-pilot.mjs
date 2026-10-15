// Starts a local, isolated integration runtime. No production services or bindings are changed.
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, existsSync, readFileSync, writeFileSync, openSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:net';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..'),
  ai = resolve(root, '../aihangout-platform');
const local = resolve(root, '.local/static-pilot');
mkdirSync(local, { recursive: true });
for (const port of [8930, 8931, 8932])
  await new Promise((resolve, reject) => {
    const server = createServer();
    server.once('error', () =>
      reject(
        Error(`Port ${port} is already occupied; reuse or stop the existing local pilot first.`)
      )
    );
    server.listen(port, '127.0.0.1', () => server.close(resolve));
  });
for (const path of [
  resolve(root, 'backend/dist/src/main.js'),
  resolve(root, 'frontend/dist/index.html'),
  resolve(ai, 'dist/worker.js'),
  resolve(ai, 'frontend/dist/index.html'),
])
  if (!existsSync(path)) throw Error('Run node scripts/static-build.mjs first; missing ' + path);
const secretsPath = resolve(local, 'runtime.json');
if (!existsSync(secretsPath))
  writeFileSync(
    secretsPath,
    JSON.stringify({
      db: randomBytes(24).toString('hex'),
      jwt: randomBytes(32).toString('hex'),
      key: randomBytes(32).toString('hex'),
      aiJwt: randomBytes(32).toString('hex'),
    }),
    { mode: 0o600 }
  );
const secrets = JSON.parse(readFileSync(secretsPath));
const dbEnv = resolve(local, 'postgres.env');
writeFileSync(
  dbEnv,
  `POSTGRES_USER=placement_test\nPOSTGRES_DB=profilepays_static\nPOSTGRES_PASSWORD=${secrets.db}\n`,
  { mode: 0o600 }
);
function run(exe, args, cwd = root) {
  const r = spawnSync(exe, args, { cwd, encoding: 'utf8', windowsHide: true });
  if (r.status !== 0) throw Error((r.stderr || r.stdout || 'command failed').slice(-3000));
  return r.stdout;
}
const container = 'profilepays-static-pilot';
const exists =
  spawnSync('docker', ['inspect', container], { stdio: 'ignore', windowsHide: true }).status === 0;
if (!exists)
  run('docker', [
    'run',
    '-d',
    '--name',
    container,
    '--env-file',
    dbEnv,
    '-p',
    '127.0.0.1:5549:5432',
    '-v',
    'profilepays-static-pilot:/var/lib/postgresql/data',
    'postgres:16',
  ]);
else run('docker', ['start', container]);
const config = resolve(local, 'wrangler.json');
writeFileSync(
  config,
  JSON.stringify({
    name: 'profilepays-local-aihangout',
    main: resolve(ai, 'dist/worker.js'),
    compatibility_date: '2024-01-15',
    compatibility_flags: ['nodejs_compat'],
    assets: { directory: resolve(ai, 'frontend/dist'), binding: 'ASSETS' },
    d1_databases: [
      {
        binding: 'AIHANGOUT_DB',
        database_name: 'profilepays-local',
        database_id: 'local',
        migrations_dir: resolve(ai, 'migrations'),
      },
    ],
    kv_namespaces: [{ binding: 'AIHANGOUT_KV', id: 'profilepays-local' }],
    vars: {
      JWT_SECRET: secrets.aiJwt,
      ENVIRONMENT: 'development',
      BETA_MODE: 'true',
      PROFILEPAYS_TEST_ENABLED: 'true',
    },
  }),
  { mode: 0o600 }
);
const wrangler = resolve(ai, 'node_modules/wrangler/bin/wrangler.js'),
  persist = resolve(local, 'd1');
run(
  process.execPath,
  [
    wrangler,
    'd1',
    'migrations',
    'apply',
    'profilepays-local',
    '--local',
    '--config',
    config,
    '--persist-to',
    persist,
  ],
  ai
);
const children = [];
let closing = false;
function cleanup() {
  if (closing) return;
  closing = true;
  for (const p of children)
    if (p.exitCode === null) {
      if (process.platform === 'win32')
        spawnSync('taskkill', ['/PID', String(p.pid), '/T', '/F'], {
          stdio: 'ignore',
          windowsHide: true,
        });
      else p.kill();
    }
}
function child(name, args, cwd, env = {}) {
  const log = openSync(resolve(local, name + '.log'), 'a');
  const p = spawn(process.execPath, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: ['ignore', log, log],
    windowsHide: true,
  });
  children.push(p);
  p.on('exit', () => {
    if (!closing) {
      console.error(name + ' exited. See its local log.');
      cleanup();
      process.exitCode = 1;
    }
  });
  return p;
}
child(
  'aihangout',
  [
    wrangler,
    'dev',
    '--config',
    config,
    '--ip',
    '127.0.0.1',
    '--port',
    '8932',
    '--persist-to',
    persist,
  ],
  ai
);
const backendEnv = {
  HOST: '127.0.0.1',
  PORT: '8931',
  NODE_ENV: 'test',
  DB_HOST: '127.0.0.1',
  DB_PORT: '5549',
  DB_USERNAME: 'placement_test',
  DB_PASSWORD: secrets.db,
  DB_NAME: 'profilepays_static',
  JWT_SECRET: secrets.jwt,
  PLACEMENT_KEY: secrets.key,
  PLACEMENT_MIGRATE: 'true',
  PROFILEPAYS_TEST_ENABLED: 'true',
  PROFILEPAYS_SHORT_TESTS: 'true',
  AIHANGOUT_ORIGIN: 'http://127.0.0.1:8932',
  FRONTEND_URL: 'http://127.0.0.1:8930',
};
writeFileSync(resolve(local, 'backend-env.json'), JSON.stringify(backendEnv), { mode: 0o600 });
const backend = child(
  'backend',
  [resolve(root, 'backend/dist/src/main.js')],
  resolve(root, 'backend'),
  backendEnv
);
child(
  'frontend',
  [
    resolve(root, 'node_modules/vite/bin/vite.js'),
    'preview',
    '--host',
    '127.0.0.1',
    '--port',
    '8930',
    '--strictPort',
  ],
  resolve(root, 'frontend'),
  { API_PROXY_TARGET: 'http://127.0.0.1:8931' }
);
writeFileSync(
  resolve(local, 'processes.json'),
  JSON.stringify({ runner: process.pid, backend: backend.pid, children: children.map(p => p.pid) })
);
try {
  for (const [url, status] of [
    ['http://127.0.0.1:8930/placements', 200],
    ['http://127.0.0.1:8931/api/placements', 401],
    ['http://127.0.0.1:8932/api/users/by-username/local-readiness/placement', 200],
  ]) {
    let ready = false;
    for (let i = 0; i < 100 && !closing; i++) {
      try {
        const r = await fetch(url, { signal: AbortSignal.timeout(1000) });
        if (r.status === status) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise(r => setTimeout(r, 250));
    }
    if (!ready) throw Error('Local service failed readiness: ' + url);
  }
} catch (e) {
  cleanup();
  throw e;
}
console.log('ProfilePays: http://127.0.0.1:8930/placements');
console.log('AIHangout: http://127.0.0.1:8932');
console.log('Local test credits only. Logs: .local/static-pilot');
process.on('SIGINT', () => {
  cleanup();
  process.exit(0);
});
process.on('SIGTERM', () => {
  cleanup();
  process.exit(0);
});
