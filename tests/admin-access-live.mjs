// Read-only application checks, apart from normal test-account login sessions.
// Never provisions an admin or resolves the owner's historical held credit.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const origin = 'https://profilepays.ultrarag.app';
const accounts = JSON.parse(fs.readFileSync('.local/public-pilot/acceptance/accounts.json'));
const checks = [];
async function request(path, token, body) {
  return fetch(origin + path, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', 'X-ProfilePays-Request': '1', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(15000),
  });
}
const health = await (await request('/api/health')).json();
assert.equal(health.release, process.env.EXPECTED_RELEASE);
assert.equal(health.mode, 'test-credits');
assert.equal((await request('/reviews')).status, 200);
assert.equal((await request('/api/placements/admin')).status, 401);
checks.push('Hosted release healthy; administrator deep link loads; anonymous API denied 401');
for (const role of ['member', 'sponsor']) {
  const r = await request('/api/auth/login', null, {email:accounts[role].email,password:accounts[role].password});
  assert.equal(r.status, 200);
  const token = (await r.json()).accessToken;
  assert.equal((await request('/api/placements/admin', token)).status, 403);
  const receipt = await (await request('/api/placements/c27168df-eb05-4260-9475-a8585cefd730/receipt', token)).json();
  assert.equal(receipt.placement.record.settlement, 'review_hold');
  assert.equal(receipt.placement.record.award, 0);
  assert.equal(receipt.placement.record.restoration, 'restored');
  assert.equal(receipt.ledger.length, 0);
  checks.push(`${role}: admin overview denied 403; historical held credit unchanged, zero award, zero ledger entries, original restored`);
}
const result = {outcome:'Worked',checkedAt:new Date().toISOString(),release:health.release,checks,productionAdminProvisioned:false,productionCreditDecisionMade:false};
fs.writeFileSync('docs/admin-evidence/public-access.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
