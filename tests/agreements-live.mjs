// Authorized test-credit workflow on the designated AIHangout fixture only.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
const dir = '.local/agreements-live';
mkdirSync(dir, { recursive: true });
const file = dir + '/private.json',
  step = process.argv[2];
let s = existsSync(file) ? JSON.parse(readFileSync(file)) : {};
const save = () => writeFileSync(file, JSON.stringify(s), { mode: 0o600 });
const pp = 'https://profilepays.ultrarag.app',
  ai = 'https://aihangout.ai';
async function api(base, path, token, method = 'GET', body, expected, grant = false) {
  const r = await fetch(base + '/api' + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token
        ? { [grant ? 'X-ProfilePays-Grant' : 'Authorization']: grant ? token : 'Bearer ' + token }
        : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(15000),
  });
  assert.ok(expected ? r.status === expected : r.ok, `${method} ${path}: ${r.status}`);
  return r.json();
}
const dash = () => api(pp, '/placements', s.member);
const remote = () => api(ai, '/users/by-username/live_countdown_test/placement');
const receipt = id => api(pp, `/placements/${id}/receipt`, s.member);
function record(name, data) {
  writeFileSync(`${dir}/${name}.json`, JSON.stringify(data, null, 2));
  console.log(name, JSON.stringify(data));
}
if (step === 'prepare') {
  assert.ok(!s.campaigns, 'Already prepared');
  assert.ok(process.env.LIVE_PROFILE_TEST_PASSWORD);
  const a = JSON.parse(readFileSync('.local/public-pilot/acceptance/accounts.json'));
  for (const role of ['member', 'sponsor'])
    s[role] = (
      await api(pp, '/auth/login', null, 'POST', {
        email: a[role].email,
        password: a[role].password,
      })
    ).accessToken;
  const login = await api(ai, '/auth/login', null, 'POST', {
    email: 'live-countdown-test-20261014@example.invalid',
    password: process.env.LIVE_PROFILE_TEST_PASSWORD,
  });
  assert.equal(login.user.username, 'live_countdown_test');
  s.ai = login.token;
  s.baseline = await remote();
  assert.equal(s.baseline.placement, null);
  s.balance = (await dash()).balance;
  s.grant = (await api(ai, '/profilepays/grant', s.ai, 'POST')).token;
  s.destination = (
    await api(pp, '/placements/destinations', s.member, 'POST', { code: s.grant })
  ).id;
  s.campaigns = {};
  s.ids = {};
  save();
  for (const [name, durationSeconds] of [
    ['complete', 30],
    ['breach', 120],
  ]) {
    s.campaigns[name] = await api(pp, '/placements/campaigns', s.sponsor, 'POST', {
      commandKey: randomUUID(),
      title: 'Live agreement ' + name + ' ' + Date.now(),
      assetKey: 'blue',
      durationSeconds,
      reward: 100,
      budget: 100,
      capacity: 1,
      notifications: { broken: true, completed: true },
    });
    save();
  }
  const c = s.campaigns.breach.id;
  for (const prefs of [
    { broken: false, completed: false },
    { broken: true, completed: false },
    { broken: false, completed: true },
    { broken: true, completed: true },
  ]) {
    const saved = await api(
      pp,
      `/placements/campaigns/${c}/notifications`,
      s.sponsor,
      'POST',
      prefs
    );
    assert.deepEqual(saved.notification_preferences, prefs);
  }
  await api(
    pp,
    `/placements/campaigns/${c}/notifications`,
    s.member,
    'POST',
    { broken: false, completed: false },
    404
  );
  await api(
    pp,
    `/placements/campaigns/${c}/notifications`,
    s.sponsor,
    'POST',
    { broken: 'yes', completed: true },
    400
  );
  record('preferences', { outcome: 'Worked', combinations: 4, unauthorized: 404, invalid: 400 });
} else if (step === 'start') {
  const name = process.argv[3];
  assert.ok(!s.ids[name]);
  const hold = await api(
    pp,
    `/placements/campaigns/${s.campaigns[name].id}/hold`,
    s.member,
    'POST',
    { commandKey: randomUUID(), destinationId: s.destination }
  );
  const p = await api(pp, `/placements/campaigns/${s.campaigns[name].id}/join`, s.member, 'POST', {
    holdId: hold.id,
    commandKey: randomUUID(),
    destinationId: s.destination,
    termsVersion: 1,
    consent: 'static-test-v1',
  });
  s.ids[name] = p.id;
  save();
  record(name + '-started', { id: p.id });
} else if (step === 'remove-replace') {
  const id = s.ids.breach;
  const before = await remote();
  assert.equal(before.placement.id, id);
  const began = Date.now();
  try {
    await api(ai, '/users/me/live-profile', s.ai, 'PUT', { profileId: null });
  } finally {
    await api(ai, '/users/me/live-profile', s.ai, 'PUT', {
      profileId: s.baseline.normal.profileId,
    });
  }
  const elapsedMs = Date.now() - began;
  const evidence = await api(
    ai,
    '/profilepays/assignments/' + id,
    s.grant,
    'GET',
    undefined,
    undefined,
    true
  );
  assert.equal(evidence.breachReason, 'user_override');
  assert.equal(evidence.stopped, true);
  assert.ok(evidence.breachedAt < evidence.endsAt);
  const retry = await api(
    ai,
    '/profilepays/assignments/' + id,
    s.grant,
    'PUT',
    { assetKey: 'blue', durationSeconds: 120, originalKey: s.baseline.normal.key },
    undefined,
    true
  );
  assert.equal(retry.state, 'ended');
  await api(ai, '/profilepays/assignments/' + id + '/renew', s.grant, 'POST', {}, 409, true);
  const final = await remote();
  assert.equal(final.placement, null);
  assert.deepEqual(final.normal, s.baseline.normal);
  record('remove-replace', {
    outcome: 'Worked',
    elapsedMs,
    attemptedReapply: retry.state,
    evidence,
    normal: final.normal,
  });
} else if (step === 'verify') {
  const name = process.argv[3],
    id = s.ids[name];
  let r;
  const until = Date.now() + 45000;
  do {
    r = await receipt(id);
    if (r.placement.state === 'ended') break;
    await new Promise(x => setTimeout(x, 1000));
  } while (Date.now() < until);
  writeFileSync(`${dir}/${name}-receipt.json`, JSON.stringify(r, null, 2));
  const p = r.placement.record;
  assert.equal(r.placement.state, 'ended');
  assert.equal(p.award, name === 'complete' ? 100 : 0);
  assert.equal(p.restoration, 'restored');
  assert.equal(
    p.notification.type,
    name === 'complete' ? 'agreement_completed' : 'agreement_broken'
  );
  assert.equal(r.ledger.length, 2);
  if (name === 'breach') {
    assert.equal(p.notification.occurredAt, p.breach.at);
    assert.equal(p.notification.withheld, 100);
    assert.equal(p.assessment, 'ineligible');
  }
  const final = await remote();
  assert.equal(final.placement, null);
  assert.deepEqual(final.normal, s.baseline.normal);
  assert.equal((await dash()).balance, s.balance + 100);
  record(name + '-result', {
    outcome: 'Worked',
    id,
    record: p,
    observations: r.observations.length,
    ledger: r.ledger,
  });
} else if (step === 'cleanup') {
  for (const c of Object.values(s.campaigns))
    await api(pp, `/placements/campaigns/${c.id}/status`, s.sponsor, 'POST', { status: 'paused' });
  const original = JSON.parse(readFileSync('.local/iphone-walkthrough/state.json'));
  await api(pp, `/placements/campaigns/${original.campaignId}/status`, s.sponsor, 'POST', {
    status: 'paused',
  });
  await api(ai, '/profilepays/grant', s.ai, 'DELETE');
  const final = await remote();
  assert.equal(final.placement, null);
  assert.deepEqual(final.normal, s.baseline.normal);
  record('cleanup', { outcome: 'Worked', grantRevoked: true, normal: final.normal });
} else throw Error('Unknown step');
