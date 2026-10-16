import assert from 'node:assert/strict';
import fs from 'node:fs';
import { randomUUID, randomBytes } from 'node:crypto';
const origin = process.env.SECURITY_ORIGIN || 'http://127.0.0.1:8937';
const file = process.env.SECURITY_ACCOUNTS || '.local/security-demo-private.json';
const results = [];
const headers = {
  'Content-Type': 'application/json',
  'X-ProfilePays-Request': '1',
  Origin: origin,
};
async function request(path, { method = 'GET', body, token, cookie, override = {} } = {}) {
  const r = await fetch(origin + '/api' + path, {
    method,
    headers: {
      ...headers,
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...override,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const text = await r.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { message: text.slice(0, 100) };
  }
  const raw = r.headers
    .getSetCookie()
    .find(x => x.startsWith('refreshToken=') && x.includes('Max-Age='));
  return {
    status: r.status,
    data,
    cookie: raw?.split(';')[0],
    raw,
    cache: r.headers.get('cache-control'),
  };
}
function status(r, expected) {
  assert.equal(
    r.status,
    expected,
    JSON.stringify({ expected, status: r.status, error: r.data.message })
  );
}
async function check(name, fn) {
  await fn();
  results.push({ scenario: name, result: 'Worked' });
  console.log('Worked: ' + name);
}
if (process.argv.includes('--create')) {
  const accounts = {};
  for (const role of ['member', 'advertiser']) {
    const body = {
      email: `security-${role}-${Date.now()}@example.invalid`,
      password: randomBytes(24).toString('base64') + 'Aa1!',
      firstName: 'Security',
      lastName: 'Fixture',
      userRole: role,
      ...(role === 'advertiser' ? { companyName: 'Security Fixture Studio' } : {}),
    };
    const r = await request('/auth/signup', { method: 'POST', body });
    status(r, 201);
    assert.equal(r.data.refreshToken, undefined);
    accounts[role] = { email: body.email, password: body.password, id: r.data.user.id };
  }
  fs.mkdirSync(file.slice(0, file.lastIndexOf('/')), { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ accounts }));
  console.log('Created two test-only accounts; credentials retained privately.');
  process.exit(0);
}
const privateData = JSON.parse(fs.readFileSync(file));
const accounts = privateData.accounts;
async function login(role) {
  const { email, password } = accounts[role];
  const r = await request('/auth/login', { method: 'POST', body: { email, password } });
  status(r, 200);
  return r;
}
let member, advertiser;
await check(
  'sign-in sets HttpOnly Strict scoped cookie; JSON has no refresh credential',
  async () => {
    member = await login('member');
    assert.ok(member.cookie);
    assert.match(member.raw, /HttpOnly/);
    assert.match(member.raw, /SameSite=Strict/);
    assert.match(member.raw, /Path=\/api\/auth/);
    if (origin.startsWith('https:')) assert.match(member.raw, /Secure/);
    assert.equal(member.data.refreshToken, undefined);
    assert.equal(member.cache, 'no-store');
  }
);
await check(
  'empty-body cookie refresh works, body credentials rejected, replay revokes family',
  async () => {
    const next = await request('/auth/refresh', {
      method: 'POST',
      body: {},
      cookie: member.cookie,
    });
    status(next, 200);
    assert.ok(next.cookie);
    assert.equal(next.data.refreshToken, undefined);
    status(
      await request('/auth/refresh', {
        method: 'POST',
        body: { refreshToken: 'a'.repeat(80) },
        cookie: next.cookie,
      }),
      400
    );
    status(
      await request('/auth/refresh', { method: 'POST', body: {}, cookie: member.cookie }),
      401
    );
    status(await request('/auth/refresh', { method: 'POST', body: {}, cookie: next.cookie }), 401);
    status(await request('/users/me', { token: next.data.accessToken }), 401);
  }
);
await check(
  'logout revokes both copied refresh cookie and already-issued access token',
  async () => {
    member = await login('member');
    status(await request('/auth/logout', { method: 'POST', body: {}, cookie: member.cookie }), 200);
    status(
      await request('/auth/refresh', { method: 'POST', body: {}, cookie: member.cookie }),
      401
    );
    status(await request('/users/me', { token: member.data.accessToken }), 401);
  }
);
await check('session endpoints reject missing request header and foreign origins', async () => {
  status(
    await request('/auth/refresh', {
      method: 'POST',
      body: {},
      override: { 'X-ProfilePays-Request': '' },
    }),
    403
  );
  status(
    await request('/auth/logout', {
      method: 'POST',
      body: {},
      override: { Origin: 'https://untrusted.example.invalid' },
    }),
    403
  );
});
advertiser = await login('advertiser');
await check(
  'advertiser denied participant connect/favorite/hold/join/release APIs and administrator API',
  async () => {
    const id = randomUUID();
    for (const path of [
      '/destinations',
      `/campaigns/${id}/favorite`,
      `/campaigns/${id}/hold`,
      `/campaigns/${id}/join`,
      `/holds/${id}/release`,
    ])
      status(
        await request('/placements' + path, {
          method: 'POST',
          body: {},
          token: advertiser.data.accessToken,
        }),
        403
      );
    status(await request('/placements/admin', { token: advertiser.data.accessToken }), 403);
  }
);
await check(
  'legacy missing-company advertiser must complete own name; null name rejected',
  async () => {
    const me = await request('/users/me', { token: advertiser.data.accessToken });
    status(me, 200);
    if (!me.data.companyName) {
      const create = await request('/placements/campaigns', {
        method: 'POST',
        body: {},
        token: advertiser.data.accessToken,
      });
      status(create, 400);
      assert.match(create.data.message, /company name/);
    }
    status(
      await request('/users/me', {
        method: 'PUT',
        body: { companyName: null },
        token: advertiser.data.accessToken,
      }),
      400
    );
    status(
      await request('/users/me', {
        method: 'PUT',
        body: { companyName: 'Security Fixture Studio' },
        token: advertiser.data.accessToken,
      }),
      200
    );
    const fresh = await request('/users/me', { token: advertiser.data.accessToken });
    assert.equal(fresh.data.companyName, 'Security Fixture Studio');
  }
);
member = await login('member');
await check('suspended participant signs in, reads standing and submits an appeal', async () => {
  const d = await request('/placements', { token: member.data.accessToken });
  status(d, 200);
  assert.ok(d.data.standing.access.some(x => x.banned));
  let existing = d.data.standing.appeals.find(x => x.status === 'pending');
  if (!existing) {
    const a = await request('/placements/appeals', {
      method: 'POST',
      body: {
        reason:
          'Security acceptance fixture: review this test suspension; sign-in and appeals must remain accessible.',
      },
      token: member.data.accessToken,
    });
    status(a, 201);
  }
  const read = await request('/placements', { token: member.data.accessToken });
  assert.ok(read.data.standing.appeals.some(x => x.status === 'pending'));
  status(await request('/placements/admin', { token: member.data.accessToken }), 403);
});
await check('suspended participant cannot reserve an offer or create a hold', async () => {
  assert.ok(privateData.campaign, 'Provide a paused test campaign fixture');
  const refused = await request(`/placements/campaigns/${privateData.campaign}/hold`, {
    method: 'POST',
    body: { destinationId: randomUUID(), commandKey: randomUUID() },
    token: member.data.accessToken,
  });
  status(refused, 403);
  assert.match(refused.data.message, /suspended/);
});
for (const session of [member, advertiser])
  status(await request('/auth/logout', { method: 'POST', body: {}, cookie: session.cookie }), 200);
const out = process.env.SECURITY_RESULTS || '.local/security-http-results.json';
fs.writeFileSync(out, JSON.stringify({ origin, at: new Date().toISOString(), results }, null, 2));
console.log(`${results.length} HTTP scenarios passed`);
