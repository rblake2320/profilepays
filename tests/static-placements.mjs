// Real local PostgreSQL + AIHangout Worker integration. Never targets production.
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
const pp = 'http://127.0.0.1:8931/api',
  ai = 'http://127.0.0.1:8932/api';
const dir = '.local/static-pilot';
mkdirSync(dir, { recursive: true });
const results = [];
function worked(scenario, measurement) {
  results.push({ scenario, outcome: 'Worked', measurement });
  console.log('Worked:', scenario, JSON.stringify(measurement));
}
async function request(base, path, token, method = 'GET', body, status) {
  const r = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await r.json();
  if (status !== undefined) assert.equal(r.status, status, JSON.stringify(data));
  else assert.ok(r.ok, `${method} ${path}: ${r.status} ${JSON.stringify(data)}`);
  return data;
}
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, predicate, timeout = 45000) {
  const end = Date.now() + timeout;
  let value;
  do {
    value = await fn();
    if (predicate(value)) return value;
    await sleep(400);
  } while (Date.now() < end);
  throw Error('Timed out: ' + JSON.stringify(value));
}
const privateFile = dir + '/accounts.json';
let accounts;
if (existsSync(privateFile)) accounts = JSON.parse(readFileSync(privateFile));
else {
  accounts = {};
  const suffix = Date.now().toString(36),
    password = 'Pilot!' + randomBytes(12).toString('hex');
  for (const [name, role] of [
    ['sponsor', 'advertiser'],
    ['member', 'member'],
    ['other', 'member'],
  ]) {
    const email = `${name}.${suffix}@example.com`;
    const response = await request(pp, '/auth/signup', null, 'POST', {
      email,
      password,
      firstName: 'Pilot',
      lastName: name,
      userRole: role,
    });
    accounts[name] = { email, password, token: response.accessToken, id: response.user.id };
  }
  for (const name of ['member', 'other']) {
    const username = `pp_${name}_${suffix}`;
    const response = await request(ai, '/auth/register', null, 'POST', {
      username,
      email: `ai.${name}.${suffix}@example.com`,
      password,
      aiAgentType: 'human',
    });
    accounts[name].ai = {
      username,
      token: response.token || response.data?.token,
      id: response.user?.id || response.data?.user?.id,
    };
    assert.ok(accounts[name].ai.token, 'AI registration token');
  }
  writeFileSync(privateFile, JSON.stringify(accounts), { mode: 0o600 });
}
const { sponsor, member, other } = accounts;
async function dashboard(who = member) {
  return request(pp, '/placements', who.token);
}
async function receipt(p, who = member) {
  return request(pp, `/placements/${p.id}/receipt`, who.token);
}
async function connect(who) {
  const grant = await request(ai, '/profilepays/grant', who.ai.token, 'POST');
  const d = await request(pp, '/placements/destinations', who.token, 'POST', { code: grant.token });
  who.destination = d.id;
  return d;
}
async function create(title, durationSeconds = 15, extras = {}) {
  return request(pp, '/placements/campaigns', sponsor.token, 'POST', {
    commandKey: randomUUID(),
    title,
    assetKey: 'blue',
    durationSeconds,
    reward: 100,
    budget: 100,
    capacity: 1,
    ...extras,
  });
}
async function join(c, who = member, key = randomUUID()) {
  return request(pp, `/placements/campaigns/${c.id}/join`, who.token, 'POST', {
    commandKey: key,
    destinationId: who.destination,
    termsVersion: 1,
    consent: 'static-test-v1',
  });
}
async function active(p, who = member) {
  return until(
    () => receipt(p, who),
    r => r.placement.state === 'active'
  );
}
async function ended(p, who = member) {
  const r = await until(
    () => receipt(p, who),
    r => r.placement.state === 'ended'
  );
  writeFileSync(`${dir}/receipt-${p.id}.json`, JSON.stringify(r, null, 2));
  return r;
}
async function normal(who = member) {
  const r = await request(ai, `/users/by-username/${who.ai.username}/placement`);
  assert.equal(r.placement, null);
  return r;
}
try {
  await connect(member);
  await connect(other);
  writeFileSync(privateFile, JSON.stringify(accounts), { mode: 0o600 });
  await request(
    pp,
    '/auth/signup',
    null,
    'POST',
    {
      email: `admin.${Date.now()}@example.com`,
      password: 'StrongPilot!123',
      firstName: 'Pilot',
      lastName: 'Admin',
      userRole: 'admin',
    },
    400
  );
  await request(pp, '/placements', null, 'GET', undefined, 401);
  const c = await create('Completed static placement');
  const key = randomUUID();
  await request(
    pp,
    `/placements/campaigns/${c.id}/join`,
    member.token,
    'POST',
    {
      commandKey: randomUUID(),
      destinationId: member.destination,
      termsVersion: 1,
      consent: 'wrong',
    },
    400
  );
  await request(
    pp,
    `/placements/campaigns/${c.id}/join`,
    other.token,
    'POST',
    {
      commandKey: randomUUID(),
      destinationId: member.destination,
      termsVersion: 1,
      consent: 'static-test-v1',
    },
    404
  );
  const before = (await dashboard()).balance,
    p = await join(c, member, key);
  assert.equal(p.state, 'reserved');
  assert.equal((await dashboard()).balance, before);
  const duplicate = await join(c, member, key);
  assert.equal(duplicate.id, p.id);
  await request(pp, `/placements/${p.id}/receipt`, other.token, 'GET', undefined, 404);
  await request(
    pp,
    `/placements/${p.id}/review`,
    member.token,
    'POST',
    { award: 100, reason: 'Self approval' },
    403
  );
  const a = await active(p);
  assert.equal(a.placement.record.endsAt - a.placement.record.startsAt, 15000);
  const visible = await request(ai, `/users/by-username/${member.ai.username}/placement`);
  assert.equal(visible.placement.id, p.id);
  const r = await ended(p);
  assert.equal(r.placement.record.award, 100);
  assert.equal(r.placement.record.restoration, 'restored');
  assert.equal(r.placement.record.assessment, 'eligible');
  assert.equal(r.ledger.length, 2);
  assert.equal(
    r.ledger.reduce((s, l) => s + l.amount, 0),
    0
  );
  assert.equal((await dashboard()).balance, before + 100);
  await normal();
  const again = await join(c, member, key);
  assert.equal(again.id, p.id);
  assert.equal((await receipt(p)).ledger.length, 2);
  worked(
    'Consent → destination verification → timed expiry → restoration → exactly-once test credits',
    {
      durationMs: 15000,
      coveredMs: r.placement.record.coveredMs,
      award: 100,
      ledgerEntries: 2,
      placementId: p.id,
    }
  );
  worked('Access controls, exact consent, no admin signup or self approval', {
    unauthenticated: 401,
    otherDestination: 404,
    otherReceipt: 404,
    invalidConsent: 400,
    adminSignup: 400,
    selfReview: 403,
  });
  const cancel = await join(await create('Participant stop', 30));
  await active(cancel);
  await request(pp, `/placements/${cancel.id}/stop`, member.token, 'POST');
  const cr = await ended(cancel);
  assert.equal(cr.placement.record.award, 0);
  assert.equal(cr.placement.record.restoration, 'restored');
  await normal();
  worked('Participant cancellation restores and earns zero', { award: cr.placement.record.award });
  const prorate = await join(await create('Sponsor stop', 30));
  await active(prorate);
  await sleep(5000);
  await request(pp, `/placements/${prorate.id}/stop`, sponsor.token, 'POST');
  const pr = await ended(prorate);
  assert.equal(pr.placement.record.assessment, 'prorated');
  assert.ok(pr.placement.record.award > 0 && pr.placement.record.award < 100);
  await normal();
  worked('Sponsor cancellation credits only sampled coverage', {
    award: pr.placement.record.award,
    coveredMs: pr.placement.record.coveredMs,
  });
  const race = await create('Final funded slot', 15);
  const answers = await Promise.allSettled([join(race, member), join(race, other)]);
  assert.equal(answers.filter(a => a.status === 'fulfilled').length, 1);
  const winner = answers.find(a => a.status === 'fulfilled').value;
  const who = winner.user_id === member.id ? member : other;
  const rr = await ended(winner, who);
  assert.equal(rr.placement.record.award, 100);
  const budget = (await dashboard()).campaigns.find(x => x.id === race.id);
  assert.equal(budget.reserved, 0);
  assert.equal(budget.spent, 100);
  worked('Concurrent claim of last slot cannot overspend', {
    winners: 1,
    spent: budget.spent,
    budget: budget.budget,
  });
  const revoked = await join(await create('Permission revoked', 30));
  await active(revoked);
  await request(ai, '/profilepays/grant', member.ai.token, 'DELETE');
  await normal();
  const rev = await ended(revoked);
  assert.equal(rev.placement.record.award, 0);
  assert.equal(rev.placement.record.settlement, 'review_hold');
  assert.equal(rev.ledger.length, 0);
  worked('Revocation removes image and holds ambiguous settlement', {
    restoration: rev.placement.record.restoration,
    settlement: rev.placement.record.settlement,
  });
} catch (error) {
  results.push({ outcome: 'Failed', error: error.message });
  console.error(error);
  process.exitCode = 1;
} finally {
  writeFileSync(
    dir + '/acceptance.json',
    JSON.stringify({ at: new Date().toISOString(), runtime: { pp, ai }, results }, null, 2)
  );
}
