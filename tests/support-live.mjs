import assert from 'node:assert/strict';
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
const origin = process.env.PILOT_ORIGIN || 'https://profilepays.ultrarag.app';
const out = '.local/screen-support'; mkdirSync(out, {recursive:true});
const report = {at:new Date().toISOString(), origin, fixture:'synthetic JPEG; no physical phone capture', checks:[]};
function pass(scenario, measurement) { report.checks.push({outcome:'Worked',scenario,measurement}); writeFileSync(`${out}/live-results.json`,JSON.stringify(report,null,2)); console.log('Worked:',scenario); }
async function call(path, method='GET', token, body) {
  const response = await fetch(origin+'/api'+path, {method, headers:{...(token?{Authorization:`Bearer ${token}`} : {}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
  return {status:response.status, cache:response.headers.get('cache-control'), data:await response.json()};
}
const accounts = JSON.parse(readFileSync('.local/public-pilot/acceptance/accounts.json','utf8'));
const member = accounts.member || accounts.participant;
assert.ok(member?.email, 'Existing private test participant fixture required');
const login = await call('/auth/login','POST',undefined,{email:member.email,password:member.password});
assert.equal(login.status,200); const jwt=login.data.accessToken;
assert.equal((await call('/support/sessions','POST')).status,401); pass('Unauthenticated creation refused',401);
const created=await call('/support/sessions','POST',jwt); assert.equal(created.status,201);
assert.match(created.cache,/no-store/); const pair=created.data, path=`/support/sessions/${pair.id}`;
writeFileSync(`${out}/private-session.json`,JSON.stringify(pair),{mode:0o600});
try {
  assert.equal((await call(path+'/frame')).status,401);
  assert.equal((await call(path+'/frame','GET',pair.publishToken)).status,401);
  assert.equal((await call(path+'/frame','POST',pair.viewToken,{frame:'/9j/2Q=='})).status,401);
  assert.equal((await call(path+'/frame','GET','x'.repeat(43))).status,401);
  pass('Missing, forged and wrong-role capabilities refused',{cases:4,status:401});
  assert.equal((await call(path+'/frame','POST',pair.publishToken,{frame:'<svg/>'})).status,400);
  assert.equal((await call(path+'/frame','POST',pair.publishToken,{frame:'A'.repeat(85001)})).status,400);
  pass('Malformed and oversized frames rejected',{cases:2,status:400});
  const frame=readFileSync(`${out}/fixture.jpg`).toString('base64');
  const sent=await call(path+'/frame','POST',pair.publishToken,{frame});assert.equal(sent.status,201);
  const seen=await call(path+'/frame','GET',pair.viewToken); assert.equal(seen.status,200); assert.equal(seen.data.frame,frame); assert.match(seen.cache,/no-store/);
  pass('Exact image relayed through public HTTPS without caching',{bytes:Buffer.from(frame,'base64').length,status:seen.data.status});
  await new Promise(r=>setTimeout(r,6500));
  const stale=await call(path+'/frame','GET',pair.viewToken); assert.equal(stale.data.frame,null);assert.equal(stale.data.status,'paused');
  pass('Stale image removed from read response',{waitMs:6500,status:stale.data.status});
  assert.equal((await call(path,'DELETE',pair.publishToken)).status,200);
  assert.equal((await call(path+'/frame','GET',pair.viewToken)).status,401);
  assert.equal((await call(path+'/frame','POST',pair.publishToken,{frame})).status,401);
  pass('Stop revokes both roles and prevents further frames',{read:401,write:401});
} finally { await call(path,'DELETE',pair.viewToken); }
