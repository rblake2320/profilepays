import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
const root = '.local/static-pilot',
  e = JSON.parse(readFileSync(root + '/backend-env.json')),
  a = JSON.parse(readFileSync(root + '/accounts.json'));
assert.equal(e.DB_NAME, 'profilepays_static');
assert.equal(e.DB_HOST, '127.0.0.1');
const db = new pg.Client({
  host: e.DB_HOST,
  port: +e.DB_PORT,
  user: e.DB_USERNAME,
  password: e.DB_PASSWORD,
  database: e.DB_NAME,
});
const base = 'http://127.0.0.1:8931/api';
let token, c;
async function post(path, body, status = 201) {
  const r = await fetch(base + path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
    body: JSON.stringify(body),
  });
  const d = await r.json();
  assert.equal(r.status, status, path);
  return d;
}
await db.connect();
try {
  token = (await post('/auth/login', { email: a.sponsor.email, password: a.sponsor.password }, 200))
    .accessToken;
  await post('/auth/logout-all', {}, 200);
  const terms = {
    commandKey: randomUUID(),
    title: 'Legacy idempotency acceptance ' + Date.now(),
    assetKey: 'blue',
    durationSeconds: 15,
    reward: 10,
    budget: 10,
    capacity: 1,
  };
  c = await post('/placements/campaigns', terms);
  // Model only this newly created private fixture in its pre-workspace schema shape.
  await db.query(
    "UPDATE placement_campaigns SET terms=terms-'brand'-'description'-'category' WHERE id=$1 AND sponsor_id=$2",
    [c.id, a.sponsor.id]
  );
  assert.equal((await post('/placements/campaigns', terms)).id, c.id);
  await post('/placements/campaigns', { ...terms, brand: 'Changed brand' }, 409);
  writeFileSync(
    root + '/legacy-retry.json',
    JSON.stringify({ outcome: 'Worked', sameId: true, changedTermsStatus: 409 }, null, 2)
  );
  console.log('Worked: legacy campaign retry returns same record; changed terms rejected');
} finally {
  if (c) await post('/placements/campaigns/' + c.id + '/status', { status: 'paused' });
  await db.end();
}
