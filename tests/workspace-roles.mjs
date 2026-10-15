// Real local UI, PostgreSQL and AIHangout acceptance. No production writes.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
const dir = '.local/static-pilot',
  out = dir + '/workspace-roles';
mkdirSync(out, { recursive: true });
const a = JSON.parse(readFileSync(dir + '/accounts.json')),
  env = JSON.parse(readFileSync(dir + '/backend-env.json'));
assert.equal(env.DB_NAME, 'profilepays_static');
assert.equal(env.AIHANGOUT_ORIGIN, 'http://127.0.0.1:8932');
const pp = 'http://127.0.0.1:8930',
  ai = env.AIHANGOUT_ORIGIN,
  results = [],
  campaigns = [];
const db = new pg.Client({
  host: env.DB_HOST,
  port: Number(env.DB_PORT),
  user: env.DB_USERNAME,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
});
let browser, hold;
const oldRoles = new Map();
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
  if (expected) assert.equal(r.status, expected, JSON.stringify(d));
  else assert.ok(r.ok, `${path}: ${r.status} ${JSON.stringify(d)}`);
  return d;
}
async function until(fn, pred, ms = 35000) {
  const end = Date.now() + ms;
  let v;
  do {
    v = await fn();
    if (pred(v)) return v;
    await new Promise(r => setTimeout(r, 300));
  } while (Date.now() < end);
  throw Error('Timed out: ' + JSON.stringify(v));
}
function worked(scenario, measurement = {}) {
  results.push({ outcome: 'Worked', scenario, measurement });
  console.log('Worked:', scenario);
}
async function role(who, value) {
  if (!oldRoles.has(who.id))
    oldRoles.set(
      who.id,
      (await db.query('SELECT user_role FROM users WHERE id=$1', [who.id])).rows[0].user_role
    );
  await db.query('UPDATE users SET user_role=$2 WHERE id=$1', [who.id, value]);
}
async function login(page, who) {
  await page.goto(pp + '/login');
  await page.getByLabel('Email address').fill(who.email);
  await page.getByLabel('Password', { exact: true }).fill(who.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.waitForFunction(() => !!localStorage.getItem('accessToken'));
  await page.locator('nav').waitFor();
}
async function connect() {
  const g = await api(ai, '/profilepays/grant', a.member.ai.token, 'POST');
  return api(pp, '/placements/destinations', a.member.token, 'POST', { code: g.token });
}
async function start(title, destination) {
  const c = await api(pp, '/placements/campaigns', a.sponsor.token, 'POST', {
    commandKey: randomUUID(),
    title,
    assetKey: 'green',
    durationSeconds: 120,
    reward: 100,
    budget: 100,
    capacity: 1,
  });
  campaigns.push(c.id);
  const p = await api(pp, `/placements/campaigns/${c.id}/join`, a.member.token, 'POST', {
    commandKey: randomUUID(),
    destinationId: destination.id,
    termsVersion: 1,
    consent: 'static-test-v1',
  });
  await until(
    () => receipt(p),
    r => r.placement.state === 'active'
  );
  return p;
}
const receipt = p => api(pp, `/placements/${p.id}/receipt`, a.member.token);
try {
  await db.connect();
  for (const who of [a.member, a.sponsor, a.other])
    who.token = (
      await api(pp, '/auth/login', null, 'POST', { email: who.email, password: who.password })
    ).accessToken;
  a.member.ai.token = (
    await api(ai, '/auth/login', null, 'POST', {
      email: a.member.email.replace(/^member\./, 'ai.member.'),
      password: a.member.password,
    })
  ).token;
  browser = await chromium.launch({ headless: true });
  const participant = await browser.newPage(),
    viewer = await browser.newPage(),
    older = await browser.newPage({ viewport: { width: 1200, height: 1000 } });
  await login(participant, a.member);
  await participant.goto(pp + '/reviews');
  await participant.waitForURL(pp + '/');
  worked('Ordinary participant cannot open the operator review page');
  await viewer.goto(ai + '/profile/' + a.member.ai.username);
  await older.goto(ai + '/problem/' + a.fixturePostId);
  const normal = `[data-normal-profile="${a.member.ai.username}"]`;
  await viewer.locator(normal).first().waitFor();
  await older.locator(normal).first().waitFor();
  const destination = await connect(),
    began = performance.now(),
    p = await start('Role and latency pilot ' + Date.now(), destination),
    selector = `[data-static-placement="${p.id}"]`;
  await Promise.all([viewer, older].map(page => page.locator(selector).first().waitFor()));
  const updateMs = performance.now() - began;
  assert.equal(await older.locator(selector).count(), 2);
  const fresh = await browser.newPage(),
    loadBegan = performance.now();
  await fresh.goto(ai + '/profile/' + a.member.ai.username);
  await fresh.locator(selector).waitFor();
  await fresh.waitForFunction(s => {
    const e = document.querySelector(s);
    return e?.complete && e.naturalWidth > 0;
  }, selector);
  const loadMs = performance.now() - loadBegan;
  await participant.goto(pp + '/placements');
  await participant.getByRole('heading', { name: p.record.terms.title, exact: true }).waitFor();
  const active = await until(
    () => receipt(p),
    r => r.placement.record.coveredMs >= 5000
  );
  await older.screenshot({ path: out + '/older-post-active.png' });
  worked('Already-open profile and both older post avatars update; fresh image loads', {
    updateMs,
    firstImageLoadMs: loadMs,
    coveredMs: active.placement.record.coveredMs,
    observations: active.observations.length,
  });
  const card = participant.locator('article').filter({ hasText: p.record.terms.title });
  await card.getByRole('button', { name: 'Stop and restore', exact: true }).click();
  await participant.getByText('Stopping early earns zero test credits.').waitFor();
  const stopAt = performance.now();
  await participant.getByRole('button', { name: 'Confirm stop and restore' }).click();
  const ended = await until(
    () => receipt(p),
    r => r.placement.state === 'ended'
  );
  await Promise.all(
    [viewer, older].map(page => page.locator(selector).first().waitFor({ state: 'detached' }))
  );
  assert.equal(ended.placement.record.award, 0);
  assert.equal(ended.placement.record.restoration, 'restored');
  assert.equal(ended.ledger.length, 2);
  assert.equal(await older.locator(normal).count(), 2);
  await older.screenshot({ path: out + '/older-post-restored.png' });
  writeFileSync(out + '/early-stop-receipt.json', JSON.stringify(ended, null, 2));
  worked(
    'Participant stops early: zero award, original profile and older posts restore without reload',
    { restoreMs: performance.now() - stopAt, award: 0, ledgerEntries: 2 }
  );
  hold = await start('Independent review pilot ' + Date.now(), destination);
  await api(ai, '/profilepays/grant', a.member.ai.token, 'DELETE');
  await until(
    () => receipt(hold),
    r => r.placement.record.settlement === 'review_hold'
  );
  await api(pp, `/placements/${hold.id}/receipt`, a.other.token, 'GET', undefined, 404);
  for (const who of [a.member, a.sponsor]) {
    await role(who, 'admin');
    try {
      await api(
        pp,
        `/placements/${hold.id}/review`,
        who.token,
        'POST',
        { award: -1, reason: 'Self review negative control' },
        403
      );
    } finally {
      await role(who, oldRoles.get(who.id));
    }
  }
  worked('Participant and campaign sponsor cannot review their own placement even with admin role');
  await role(a.other, 'admin');
  const operator = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  await login(operator, a.other);
  await operator.goto(pp + '/reviews');
  const row = operator.locator('.pp-row').filter({ hasText: hold.record.terms.title });
  await row.getByRole('button', { name: 'Inspect evidence' }).click();
  await operator.getByLabel('Test-credit award').fill('0');
  await operator
    .getByLabel('Review reason')
    .fill('Connection revoked during local test; release reservation without an award.');
  await operator.screenshot({ path: out + '/operator-evidence.png' });
  await operator.getByRole('button', { name: 'Record review decision' }).click();
  await operator.getByText('Review recorded. The test ledger has been settled.').waitFor();
  const resolved = await receipt(hold);
  assert.equal(resolved.placement.record.settlement, 'released');
  assert.equal(resolved.ledger.length, 2);
  await api(
    pp,
    `/placements/${hold.id}/review`,
    a.other.token,
    'POST',
    { award: 0, reason: 'Duplicate test decision' },
    409
  );
  await operator.screenshot({ path: out + '/operator-settled.png' });
  writeFileSync(out + '/review-receipt.json', JSON.stringify(resolved, null, 2));
  worked('Independent operator inspects evidence and settles once; duplicate decision rejected', {
    award: 0,
    ledgerEntries: 2,
    duplicateStatus: 409,
  });
} catch (e) {
  results.push({ outcome: 'Failed', scenario: e.message });
  process.exitCode = 1;
  console.error(e.message);
} finally {
  for (const [id, value] of oldRoles)
    await db.query('UPDATE users SET user_role=$2 WHERE id=$1', [id, value]);
  for (const id of campaigns)
    await api(pp, `/placements/campaigns/${id}/status`, a.sponsor.token, 'POST', {
      status: 'paused',
    }).catch(() => {});
  await browser?.close();
  await db.end();
  writeFileSync(
    out + '/results.json',
    JSON.stringify({ finished: new Date().toISOString(), results }, null, 2)
  );
}
