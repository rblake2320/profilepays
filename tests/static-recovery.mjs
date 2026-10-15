// Run only after stopping the ordinary local backend. Owns all workers it starts.
import { spawn } from 'node:child_process';
import { readFileSync, writeFileSync, openSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import assert from 'node:assert/strict';
import pg from 'pg';
import { createServer } from 'node:http';
const dir = '.local/static-pilot',
  env = JSON.parse(readFileSync(dir + '/backend-env.json'));
assert.equal(env.DB_NAME, 'profilepays_static');
assert.equal(env.AIHANGOUT_ORIGIN, 'http://127.0.0.1:8932');
const accounts = JSON.parse(readFileSync(dir + '/accounts.json')),
  { member, sponsor, other } = accounts;
const origin = 'http://127.0.0.1:8933',
  ai = env.AIHANGOUT_ORIGIN,
  children = [],
  results = [];
const db = new pg.Client({
  host: env.DB_HOST,
  port: Number(env.DB_PORT),
  user: env.DB_USERNAME,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
});
const pause = ms => new Promise(r => setTimeout(r, ms));
let corruptImage = false;
const proxy = createServer(async (req, res) => {
  try {
    if (corruptImage && req.url.startsWith('/profilepays/')) {
      res.writeHead(200, { 'Content-Type': 'image/png' });
      res.end('corrupted approved image');
      return;
    }
    const body = [];
    for await (const chunk of req) body.push(chunk);
    const headers = { ...req.headers };
    delete headers.host;
    delete headers['content-length'];
    const response = await fetch(ai + req.url, {
      method: req.method,
      headers,
      ...(body.length ? { body: Buffer.concat(body) } : {}),
    });
    res.writeHead(response.status, {
      'Content-Type': response.headers.get('content-type') || 'application/json',
    });
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    res.writeHead(503);
    res.end('Local fault proxy unavailable');
  }
});
async function api(base, path, token, method = 'GET', body, expected) {
  const r = await fetch(base + '/api' + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const d = await r.json();
  assert.equal(
    r.status,
    expected ?? (method === 'POST' && base === origin ? 201 : 200),
    JSON.stringify(d)
  );
  return d;
}
async function until(fn, predicate, timeout = 30000) {
  const end = Date.now() + timeout;
  let d;
  do {
    d = await fn();
    if (predicate(d)) return d;
    await pause(500);
  } while (Date.now() < end);
  throw Error('Timed out: ' + JSON.stringify(d));
}
async function start(port) {
  const child = spawn(process.execPath, ['backend/dist/src/main.js'], {
    env: { ...process.env, ...env, PORT: String(port), AIHANGOUT_ORIGIN: 'http://127.0.0.1:8935' },
    windowsHide: true,
    stdio: [
      'ignore',
      openSync(dir + '/recovery-worker.log', 'a'),
      openSync(dir + '/recovery-worker.log', 'a'),
    ],
  });
  children.push(child);
  for (let i = 0; i < 50; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/api/placements`);
      if (r.status === 401) return child;
    } catch {}
    await pause(200);
  }
  throw Error('Worker did not start');
}
async function stop(child) {
  const exited = once(child, 'exit');
  child.kill();
  await exited;
}
function worked(scenario, measurement) {
  results.push({ outcome: 'Worked', scenario, measurement });
  console.log('Worked:', scenario, JSON.stringify(measurement));
}
async function placement(title, duration = 30) {
  const c = await api(origin, '/placements/campaigns', sponsor.token, 'POST', {
    commandKey: randomUUID(),
    title,
    assetKey: 'green',
    durationSeconds: duration,
    reward: 100,
    budget: 100,
    capacity: 1,
  });
  const p = await api(origin, `/placements/campaigns/${c.id}/join`, member.token, 'POST', {
    commandKey: randomUUID(),
    destinationId: member.destination,
    termsVersion: 1,
    consent: 'static-test-v1',
  });
  await until(
    () => api(origin, `/placements/${p.id}/receipt`, member.token),
    r => r.placement.state === 'active'
  );
  return p;
}
async function receipt(p) {
  return api(origin, `/placements/${p.id}/receipt`, member.token);
}
try {
  // Fail closed if another reconciler is running on the ordinary local port.
  let occupied = false;
  try {
    await fetch('http://127.0.0.1:8931/api/placements');
    occupied = true;
  } catch {}
  assert.equal(occupied, false, 'Stop the ordinary local backend before this recovery test');
  await db.connect();
  await new Promise(resolve => proxy.listen(8935, '127.0.0.1', resolve));
  let worker = await start(8933);
  for (const who of [member, sponsor, other]) {
    const auth = await api(
      origin,
      '/auth/login',
      null,
      'POST',
      { email: who.email, password: who.password },
      200
    );
    who.token = auth.accessToken;
  }
  const grant = await api(ai, '/profilepays/grant', member.ai.token, 'POST');
  const d = await api(origin, '/placements/destinations', member.token, 'POST', {
    code: grant.token,
  });
  member.destination = d.id;
  const p = await placement('Durable worker loss and lease expiry', 150);
  const active = await api(ai, `/users/by-username/${member.ai.username}/placement`);
  const began = Date.now();
  await stop(worker);
  console.log('Worker stopped; checking destination-owned lease expiry for up to 125 seconds.');
  await until(
    () => api(ai, `/users/by-username/${member.ai.username}/placement`),
    r => r.placement === null,
    125000
  );
  const elapsed = Date.now() - began;
  assert.ok(elapsed < 125000);
  worked('AIHangout restores independently while ProfilePays is offline', {
    elapsedMs: elapsed,
    leaseUntil: active.placement.leaseUntil,
    contractEnd: active.placement.endsAt,
  });
  worker = await start(8933);
  const contender = await start(8934);
  const r = await until(
    () => receipt(p),
    r => r.placement.state === 'ended'
  );
  assert.equal(r.placement.record.settlement, 'review_hold');
  assert.equal(r.ledger.length, 0);
  assert.equal(r.placement.record.restoration, 'restored');
  writeFileSync(dir + '/recovery-receipt.json', JSON.stringify(r, null, 2));
  worked('Two restarted reconcilers preserve evidence gap and do not self-award', {
    settlement: r.placement.record.settlement,
    ledgerEntries: 0,
  });
  // Seed an independent operator in this isolated test DB; public signup cannot choose admin.
  await db.query("UPDATE users SET user_role='admin' WHERE id=$1", [other.id]);
  await api(origin, `/placements/${p.id}/review`, other.token, 'POST', {
    award: 0,
    reason: 'Local outage test: uncovered interval; release reserved test credits.',
  });
  const reviewed = await receipt(p);
  assert.equal(reviewed.ledger.length, 2);
  assert.equal(reviewed.placement.record.settlement, 'released');
  await api(
    origin,
    `/placements/${p.id}/review`,
    other.token,
    'POST',
    { award: 100, reason: 'Duplicate attempt' },
    409
  );
  worked('Independent operator resolves hold exactly once', {
    award: 0,
    ledgerEntries: 2,
    duplicate: 409,
  });
  const changed = await placement('Preserve owner profile change');
  const newProfile = randomUUID();
  await api(ai, '/users/me/live-profile', member.ai.token, 'PUT', { profileId: newProfile });
  const changedResult = await until(
    () => receipt(changed),
    r => r.placement.state === 'ended'
  );
  assert.equal(changedResult.placement.record.restoration, 'preserved_user_change');
  assert.equal(changedResult.placement.record.award, 0);
  const state = await api(ai, `/users/by-username/${member.ai.username}/placement`);
  assert.equal(state.normal.profileId, newProfile);
  assert.equal(state.placement, null);
  worked('Owner change wins over automatic restoration', {
    preservedProfileId: newProfile,
    award: 0,
  });
  await api(ai, '/users/me/live-profile', member.ai.token, 'PUT', { profileId: null });
  const late = await placement('Late sponsor cancellation', 15);
  const lateActive = await receipt(late);
  await pause(Math.max(0, lateActive.placement.record.endsAt - Date.now() - 3500));
  await db.query(
    "UPDATE placements SET record=jsonb_set(record,'{nextCheck}',to_jsonb($2::bigint)) WHERE id=$1",
    [late.id, lateActive.placement.record.endsAt + 5000]
  );
  await pause(Math.max(0, lateActive.placement.record.endsAt - Date.now() + 50));
  await api(origin, `/placements/${late.id}/stop`, sponsor.token, 'POST');
  const lateResult = await until(
    () => receipt(late),
    r => r.placement.state === 'ended'
  );
  assert.equal(lateResult.placement.record.award, 100);
  worked('Cancellation after the deadline cannot reduce an earned award', { award: 100 });
  const corrupted = await placement('Corrupted approved asset', 15);
  corruptImage = true;
  const corruptedResult = await until(
    () => receipt(corrupted),
    r => r.placement.state === 'ended'
  );
  corruptImage = false;
  assert.equal(corruptedResult.placement.record.settlement, 'review_hold');
  assert.ok(
    corruptedResult.observations.some(
      o => o.kind === 'unknown' && o.evidence.error === 'Approved image bytes changed'
    )
  );
  assert.equal(corruptedResult.ledger.length, 0);
  await api(origin, `/placements/${corrupted.id}/review`, other.token, 'POST', {
    award: 0,
    reason: 'Injected image corruption; no verified full placement.',
  });
  worked('Wrong PNG bytes prevent automatic reward and trigger review', {
    ledgerBeforeReview: 0,
    restoration: corruptedResult.placement.record.restoration,
  });
  await stop(contender);
  await stop(worker);
} catch (e) {
  results.push({ outcome: 'Failed', error: e.message });
  console.error(e.message);
  process.exitCode = 1;
} finally {
  proxy.close();
  for (const p of children) if (p.exitCode === null && !p.killed) p.kill();
  if (db._connected) {
    await db.query("UPDATE users SET user_role='member' WHERE id=$1", [other.id]);
    await db.end();
  }
  writeFileSync(dir + '/accounts.json', JSON.stringify(accounts), { mode: 0o600 });
  writeFileSync(
    dir + '/recovery.json',
    JSON.stringify({ at: new Date().toISOString(), results }, null, 2)
  );
}
