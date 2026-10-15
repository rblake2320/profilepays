import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { randomUUID, createHash } from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url),
  { PNG } = require('pngjs');
const root = '.local/static-pilot',
  a = JSON.parse(readFileSync(root + '/accounts.json')),
  pp = 'http://127.0.0.1:8931/api',
  ai = 'http://127.0.0.1:8932/api',
  results = [];
async function req(base, path, token, method = 'GET', body, status) {
  const r = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const d = await r.json();
  if (status) assert.equal(r.status, status, JSON.stringify(d));
  else assert.ok(r.ok, `${path}: ${r.status} ${JSON.stringify(d)}`);
  return d;
}
function worked(scenario, measurement) {
  results.push({ outcome: 'Worked', scenario, measurement });
  console.log('Worked:', scenario);
}
async function until(fn, pred) {
  for (let i = 0; i < 100; i++) {
    const v = await fn();
    if (pred(v)) return v;
    await new Promise(r => setTimeout(r, 400));
  }
  throw Error('Timed out');
}
try {
  for (const who of Object.values(a).filter(v => v?.email)) {
    const r = await req(pp, '/auth/login', null, 'POST', {
      email: who.email,
      password: who.password,
    });
    who.token = r.accessToken;
  }
  const img = new PNG({ width: 128, height: 128 });
  for (let y = 0; y < 128; y++)
    for (let x = 0; x < 128; x++) {
      let i = (y * 128 + x) * 4;
      img.data.set(x + y > 128 ? [231, 183, 102, 255] : [46, 69, 61, 255], i);
    }
  const png = PNG.sync.write(img).toString('base64');
  const creative = await req(pp, '/placements/creatives', a.sponsor.token, 'POST', {
    name: 'Autumn community fixture',
    png,
  });
  assert.match(creative.asset_key, /^sha256-/);
  assert.equal(
    creative.asset_key,
    'sha256-' +
      createHash('sha256').update(Buffer.from(creative.png_base64, 'base64')).digest('hex')
  );
  assert.equal(
    (
      await req(pp, '/placements/creatives', a.sponsor.token, 'POST', {
        name: 'Duplicate fixture',
        png,
      })
    ).id,
    creative.id
  );
  await req(pp, '/placements/creatives', a.member.token, 'POST', { name: 'Forbidden', png }, 403);
  await req(
    pp,
    '/placements/creatives',
    a.sponsor.token,
    'POST',
    { name: 'Invalid', png: 'aW52YWxpZA==' },
    400
  );
  worked('PNG validation, content hashing, upload deduplication and member upload rejection', {
    pixels: 128,
  });
  const terms = {
    commandKey: randomUUID(),
    title: 'Custom creative lifecycle ' + Date.now(),
    brand: 'Community Lab',
    description: 'A local custom-image verification fixture.',
    category: 'Community',
    assetKey: creative.asset_key,
    durationSeconds: 15,
    reward: 120,
    budget: 240,
    capacity: 2,
  };
  const c = await req(pp, '/placements/campaigns', a.sponsor.token, 'POST', terms);
  await req(
    pp,
    `/placements/campaigns/${c.id}/status`,
    a.member.token,
    'POST',
    { status: 'paused' },
    404
  );
  await req(pp, `/placements/campaigns/${c.id}/favorite`, a.member.token, 'POST', { saved: true });
  assert.ok((await req(pp, '/placements', a.member.token)).favorites.includes(c.id));
  assert.ok(!(await req(pp, '/placements', a.other.token)).favorites.includes(c.id));
  await req(pp, `/placements/campaigns/${c.id}/favorite`, a.member.token, 'POST', { saved: false });
  assert.ok(!(await req(pp, '/placements', a.member.token)).favorites.includes(c.id));
  worked('Campaign ownership and persistent per-user saved offers', { campaignId: c.id });
  const login = await req(ai, '/auth/login', null, 'POST', {
    email: a.member.email.replace(/^member\./, 'ai.member.'),
    password: a.member.password,
  });
  a.member.ai.token = login.token || login.data?.token;
  const grant = await req(ai, '/profilepays/grant', a.member.ai.token, 'POST');
  const badImage = await fetch(ai + '/profilepays/assignments/' + randomUUID(), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'X-ProfilePays-Grant': grant.token },
    body: JSON.stringify({
      assetKey: 'sha256-' + '0'.repeat(64),
      png,
      durationSeconds: 15,
      originalKey: 'invalid',
    }),
  });
  assert.equal(badImage.status, 400);
  worked('Connector rejects mismatched creative hash', { status: badImage.status });
  const dest = await req(pp, '/placements/destinations', a.member.token, 'POST', {
    code: grant.token,
  });
  const before = await req(ai, `/users/by-username/${a.member.ai.username}/placement`);
  assert.equal(before.placement, null);
  const join = {
    commandKey: randomUUID(),
    destinationId: dest.id,
    termsVersion: 1,
    consent: 'static-test-v1',
  };
  await req(pp, `/placements/campaigns/${c.id}/status`, a.sponsor.token, 'POST', {
    status: 'paused',
  });
  await req(pp, `/placements/campaigns/${c.id}/join`, a.member.token, 'POST', join, 409);
  await req(pp, `/placements/campaigns/${c.id}/status`, a.sponsor.token, 'POST', {
    status: 'active',
  });
  const p = await req(pp, `/placements/campaigns/${c.id}/join`, a.member.token, 'POST', join);
  await until(
    () => req(pp, `/placements/${p.id}/receipt`, a.member.token),
    r => r.placement.state === 'active'
  );
  const visible = await req(ai, `/users/by-username/${a.member.ai.username}/placement`);
  assert.equal(visible.placement.assetKey, creative.asset_key);
  const image = await fetch('http://127.0.0.1:8932' + visible.placement.assetUrl);
  assert.equal(image.headers.get('content-type'), 'image/png');
  assert.equal(
    createHash('sha256')
      .update(Buffer.from(await image.arrayBuffer()))
      .digest('hex'),
    creative.asset_key.slice(7)
  );
  await req(pp, `/placements/campaigns/${c.id}/status`, a.sponsor.token, 'POST', {
    status: 'paused',
  });
  const receipt = await until(
    () => req(pp, `/placements/${p.id}/receipt`, a.member.token),
    r => r.placement.state === 'ended'
  );
  assert.equal(receipt.placement.record.award, 120);
  assert.equal(receipt.placement.record.restoration, 'restored');
  const after = await req(ai, `/users/by-username/${a.member.ai.username}/placement`);
  assert.equal(after.placement, null);
  assert.deepEqual(after.normal, before.normal);
  writeFileSync(root + '/creative-receipt.json', JSON.stringify(receipt, null, 2));
  worked(
    'Custom creative renders, pause blocks new enrollment but preserves active placement, timed verification settles and restores',
    {
      award: 120,
      observations: receipt.observations.length,
      restoration: 'restored',
      placementId: p.id,
    }
  );
  writeFileSync(root + '/custom-creative.png', Buffer.from(creative.png_base64, 'base64'));
} catch (e) {
  results.push({ outcome: 'Failed', error: e.message });
  console.error(e);
  process.exitCode = 1;
} finally {
  writeFileSync(root + '/creative-results.json', JSON.stringify(results, null, 2));
  writeFileSync(root + '/accounts.json', JSON.stringify(a));
}
