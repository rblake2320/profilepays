import fs from 'node:fs';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
const dir = '.local/fair-live',
  file = dir + '/private.json';
fs.mkdirSync(dir, { recursive: true });
let s = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file)) : {};
const save = () => fs.writeFileSync(file, JSON.stringify(s), { mode: 0o600 });
const pp = 'https://profilepays.ultrarag.app',
  ai = 'https://aihangout.ai';
async function api(base, path, token, method = 'GET', body, status) {
  const r = await fetch(base + '/api' + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(15000),
  });
  assert.ok(status ? r.status === status : r.ok, `${method} ${path}: ${r.status}`);
  return r.json();
}
const post = (path, body, role = 'member', status) => api(pp, path, s[role], 'POST', body, status);
const dash = () => api(pp, '/placements', s.member);
const normal = () => api(ai, '/users/by-username/live_countdown_test/placement');
const log = (name, data) => {
  fs.writeFileSync(`${dir}/${name}.json`, JSON.stringify(data, null, 2));
  console.log(JSON.stringify({ name, ...data }));
};
const hold = c =>
  post(`/placements/campaigns/${c}/hold`, {
    destinationId: s.destination,
    commandKey: randomUUID(),
  });
const join = (c, h) =>
  post(`/placements/campaigns/${c}/join`, {
    holdId: h.id,
    destinationId: s.destination,
    commandKey: randomUUID(),
    termsVersion: 1,
    consent: 'static-test-v1',
  });
const step = process.argv[2];
if (step === 'prepare') {
  assert.ok(!s.campaigns, 'Already prepared');
  const accounts = JSON.parse(fs.readFileSync('.local/public-pilot/acceptance/accounts.json'));
  for (const role of ['member', 'sponsor'])
    s[role] = (
      await api(pp, '/auth/login', null, 'POST', {
        email: accounts[role].email,
        password: accounts[role].password,
      })
    ).accessToken;
  s.memberId = accounts.member.id;
  s.ai = (
    await api(ai, '/auth/login', null, 'POST', {
      email: 'live-countdown-test-20261014@example.invalid',
      password: process.env.LIVE_PROFILE_TEST_PASSWORD,
    })
  ).token;
  s.baseline = await normal();
  assert.equal(s.baseline.placement, null);
  s.balance = (await dash()).balance;
  s.grant = (await api(ai, '/profilepays/grant', s.ai, 'POST')).token;
  s.destination = (await post('/placements/destinations', { code: s.grant })).id;
  s.campaigns = {};
  save();
  for (const name of ['complete', 'breach', 'limited']) {
    s.campaigns[name] = (
      await post(
        '/placements/campaigns',
        {
          commandKey: randomUUID(),
          title: 'Fair marketplace ' + name + ' ' + Date.now(),
          assetKey: 'blue',
          durationSeconds: name === 'breach' ? 120 : 30,
          reward: 100,
          budget: 100,
          capacity: 1,
          maxBreaches: name === 'limited' ? 1 : null,
        },
        'sponsor'
      )
    ).id;
    save();
  }
  const c = s.campaigns.complete;
  const d = await dash();
  assert.equal(d.identity.realPayoutsEnabled, false);
  assert.equal(d.identity.status, 'not_verified');
  await post('/placements/identity/start', {}, 'member', 503);
  await post('/payments/payout', {}, 'member', 404);
  await post(
    `/placements/participants/${s.memberId}/access`,
    { banned: true, reason: 'Test unauthorized advertiser ban' },
    'sponsor',
    403
  );
  await post(
    `/placements/campaigns/${s.campaigns.limited}/hold`,
    { destinationId: s.destination, commandKey: randomUUID() },
    'member',
    403
  );
  const h = await hold(c);
  await post(
    '/placements/exclusions',
    {
      userIds: [s.memberId],
      blocked: true,
      groupName: 'QA list',
      reason: 'Temporary test-only brand exclusion',
    },
    'sponsor'
  );
  await post(
    `/placements/campaigns/${c}/join`,
    {
      holdId: h.id,
      destinationId: s.destination,
      commandKey: randomUUID(),
      termsVersion: 1,
      consent: 'static-test-v1',
    },
    'member',
    403
  );
  await post(
    '/placements/exclusions',
    { userIds: [s.memberId], blocked: false, reason: 'Test completed; restore eligibility' },
    'sponsor'
  );
  await post(`/placements/holds/${h.id}/release`, {}, 'sponsor', 404);
  await post(`/placements/holds/${h.id}/release`, {});
  for (const broken of [false, true])
    for (const completed of [false, true])
      assert.deepEqual(
        (await post(`/placements/campaigns/${c}/notifications`, { broken, completed }, 'sponsor'))
          .notification_preferences,
        { broken, completed }
      );
  await post(
    `/placements/campaigns/${c}/notifications`,
    { broken: false, completed: false },
    'member',
    404
  );
  await post(
    `/placements/campaigns/${c}/notifications`,
    { broken: 'yes', completed: true },
    'sponsor',
    400
  );
  await post(`/placements/campaigns/${c}/analytics`, { package: 'all' }, 'member', 404);
  s.hold = await hold(c);
  s.breachesBefore = (await dash()).standing.breaches.length;
  save();
  log('policies', {
    outcome: 'Worked',
    identityStart: 503,
    realPayoutEndpoint: 404,
    nonAdminBan: 403,
    breachLimit: 403,
    excludedConfirmation: 403,
    foreignRelease: 404,
    preferences: 4,
    hold: s.hold.id,
    expiresAt: Number(s.hold.expires_at_ms),
    campaign: c,
    destination: s.destination,
  });
} else if (step === 'expiry') {
  assert.ok(Date.now() > Number(s.hold.expires_at_ms), 'Wait until deadline');
  await post(
    `/placements/campaigns/${s.campaigns.complete}/join`,
    {
      holdId: s.hold.id,
      destinationId: s.destination,
      commandKey: randomUUID(),
      termsVersion: 1,
      consent: 'static-test-v1',
    },
    'member',
    409
  );
  assert.equal((await dash()).standing.breaches.length, s.breachesBefore);
  assert.equal((await normal()).placement, null);
  log('expiry', {
    outcome: 'Worked',
    elapsedMs: Date.now() - Number(s.hold.created_at_ms),
    noPlacement: true,
    noBreach: true,
  });
} else if (step === 'start') {
  const name = process.argv[3];
  const h = await hold(s.campaigns[name]);
  s[name] = (await join(s.campaigns[name], h)).id;
  save();
  log('start-' + name, { id: s[name] });
} else if (step === 'remove') {
  const before = await normal();
  assert.equal(before.placement.id, s.breach);
  const start = Date.now();
  try {
    await api(ai, '/users/me/live-profile', s.ai, 'PUT', { profileId: null });
  } finally {
    await api(ai, '/users/me/live-profile', s.ai, 'PUT', {
      profileId: s.baseline.normal.profileId,
    });
  }
  log('remove-replace', { elapsedMs: Date.now() - start });
} else if (step === 'verify') {
  const name = process.argv[3];
  let d, p;
  const deadline = Date.now() + 45000;
  do {
    d = await dash();
    p = d.placements.find(p => p.campaign_id === s.campaigns[name]);
    if (p?.state === 'ended') break;
    await new Promise(r => setTimeout(r, 2000));
  } while (Date.now() < deadline);
  assert.ok(p);
  s[name] = p.id;
  save();
  const r = await api(pp, `/placements/${p.id}/receipt`, s.member);
  assert.equal(p.state, 'ended');
  assert.equal(p.record.award, name === 'complete' ? 100 : 0);
  assert.equal(p.record.restoration, 'restored');
  assert.equal(
    p.record.notification.type,
    name === 'complete' ? 'agreement_completed' : 'agreement_broken'
  );
  assert.equal(r.ledger.length, 2);
  if (name === 'breach')
    assert.equal(d.standing.breaches.filter(b => b.placement_id === p.id).length, 1);
  assert.deepEqual((await normal()).normal, s.baseline.normal);
  log(name, {
    outcome: 'Worked',
    placement: p.id,
    record: p.record,
    ledger: r.ledger,
    observations: r.observations.length,
  });
} else if (step === 'cleanup') {
  assert.equal((await normal()).placement, null);
  assert.deepEqual((await normal()).normal, s.baseline.normal);
  for (const c of Object.values(s.campaigns))
    await post(`/placements/campaigns/${c}/status`, { status: 'paused' }, 'sponsor');
  await api(ai, '/profilepays/grant', s.ai, 'DELETE');
  const analytics = await post(
    `/placements/campaigns/${s.campaigns.complete}/analytics`,
    { package: 'all' },
    'sponsor'
  );
  assert.equal(analytics.demand.confirmed, 1);
  assert.ok(analytics.demand.expired >= 1);
  assert.equal(analytics.delivery.completed, 1);
  assert.equal(analytics.delivery.testcredits, 100);
  log('cleanup', { outcome: 'Worked', grantRevoked: true, originalRestored: true, analytics });
} else throw Error('Unknown stage');
