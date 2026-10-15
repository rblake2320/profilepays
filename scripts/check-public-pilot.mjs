import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const origin = 'https://profilepays.ultrarag.app';
const dir = '.local/public-pilot';
const accounts = JSON.parse(readFileSync(`${dir}/acceptance/accounts.json`));
const checks = [];
async function request(path, token, body, method = body ? 'POST' : 'GET') {
  return fetch(origin + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(15000) });
}
async function login(who) {
  const r = await request('/api/auth/login', null, {email: who.email, password: who.password});
  assert.equal(r.status, 200); return (await r.json()).accessToken;
}
function pass(scenario) { checks.push({outcome:'Worked', scenario}); console.log('Worked:', scenario); }
for (const path of ['/marketplace', '/connections', '/placements']) {
  const r = await request(path); assert.equal(r.status, 200); assert.match(r.headers.get('content-type'), /text\/html/);
  const imagePolicy = r.headers.get('content-security-policy')?.split(';').find(v=>v.trim().startsWith('img-src '));
  assert.ok(imagePolicy?.split(/\s+/).includes('https://aihangout.ai'), 'Hosted CSP must permit the configured AIHangout campaign preview origin');
}
pass('HTTPS dashboard deep links load');
assert.equal((await request('/api/placements')).status, 401);
assert.equal((await request('/.env')).status, 404);
assert.equal((await request('/api/not-a-route')).status, 404);
assert.equal((await request('/missing.js')).status, 404);
pass('Private API requires authentication; missing API/assets and dotfiles do not become dashboard pages');
const r = await fetch(origin+'/api/health', {headers:{Origin:'https://unrelated.example'}});
assert.notEqual(r.headers.get('access-control-allow-origin'), 'https://unrelated.example');
assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
pass('Unrelated browser origins are not granted CORS access; security headers present');
const member = await login(accounts.member), sponsor = await login(accounts.sponsor);
const c = {commandKey: randomUUID(),title:'Authorization check',assetKey:'blue',durationSeconds:60,reward:100,budget:100,capacity:1};
assert.equal((await request('/api/placements/campaigns', member, c)).status, 403);
assert.equal((await request('/api/auth/signup', null, {email:`forbidden.${Date.now()}@example.invalid`,password:'InvalidRole1!',firstName:'Test',lastName:'Role',userRole:'admin'})).status, 400);
pass('Participant cannot create sponsor campaigns; public signup cannot create administrators');
const dashboard = await (await request('/api/placements',member)).json();
assert.ok(dashboard.placements.every(p=>p.state==='ended'));
assert.equal(dashboard.balance, 100);
pass('Completed and early-stop receipts persist with a 100-credit balance');
const seed = [];
for (const [mode,duration,assetKey] of [['complete',60,'blue'],['stop early',120,'green']]) {
  const title=`iPhone live test — ${mode}`;
  let campaign=dashboard.campaigns.find(c=>c.terms.title===title);
  if (!campaign) {
    const r=await request('/api/placements/campaigns',sponsor,{commandKey:randomUUID(),title,assetKey,durationSeconds:duration,reward:100,budget:1000,capacity:10,brand:'ProfilePays test lab',category:'Community',description:mode==='complete'?'Keep this image active for 60 seconds, then verify restoration and 100 test credits.':'Stop this 120-second placement early. Your normal profile returns and no credits are earned.'});
    assert.equal(r.status,201); campaign=await r.json();
  }
  seed.push({id:campaign.id,title,durationSeconds:duration,url:origin+'/confirmation?campaign='+campaign.id});
}
writeFileSync(`${dir}/phone-offers.json`,JSON.stringify(seed,null,2));
writeFileSync(`${dir}/hosting-checks.json`,JSON.stringify({checkedAt:new Date().toISOString(),origin,checks,offers:seed},null,2));
console.log(JSON.stringify(seed,null,2));
