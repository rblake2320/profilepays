import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {randomUUID,createHash} from 'node:crypto';
const pp='https://profilepays.ultrarag.app',ai='https://aihangout.ai',out='.local/qa-remediation',stateFile=out+'/lifecycle-private.json';
const step=process.argv[2];mkdirSync(out,{recursive:true});
let s=existsSync(stateFile)?JSON.parse(readFileSync(stateFile)):{};
const reportFile=out+'/lifecycle-results.json',report=existsSync(reportFile)?JSON.parse(readFileSync(reportFile)):{checks:[]};
const pass=(scenario,measurement)=>{report.checks.push({at:new Date().toISOString(),outcome:'Worked',scenario,measurement});writeFileSync(reportFile,JSON.stringify(report,null,2));console.log('Worked:',scenario,JSON.stringify(measurement));};
async function api(base,path,token,method='GET',body){const r=await fetch(base+'/api'+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});assert.ok(r.ok,`${method} ${path}: ${r.status}`);return r.json();}
const placement=()=>api(ai,'/users/by-username/live_countdown_test/placement');
if(step==='prepare'){
 assert.ok(process.env.LIVE_PROFILE_TEST_PASSWORD);
 const auth=await api(ai,'/auth/login',null,'POST',{email:'live-countdown-test-20261014@example.invalid',password:process.env.LIVE_PROFILE_TEST_PASSWORD});assert.equal(auth.user.username,'live_countdown_test');
 s={aiToken:auth.token,baseline:await placement(),accounts:JSON.parse(readFileSync('.local/public-pilot/acceptance/accounts.json')),campaigns:{}};assert.equal(s.baseline.placement,null);
 for(const a of Object.values(s.accounts))a.token=(await api(pp,'/auth/login',null,'POST',{email:a.email,password:a.password})).accessToken;
 s.balance=(await api(pp,'/placements',s.accounts.member.token)).balance;
 s.grant=(await api(ai,'/profilepays/grant',s.aiToken,'POST')).token;
 const creative=await api(pp,'/placements/creatives',s.accounts.sponsor.token,'POST',{name:'QA approved image',png:readFileSync('tests/fixtures/placement.png').toString('base64')});s.assetKey=creative.asset_key;
 for(const [name,durationSeconds] of [['complete',60],['early',120]])s.campaigns[name]=await api(pp,'/placements/campaigns',s.accounts.sponsor.token,'POST',{commandKey:randomUUID(),title:`QA ${name} ${Date.now()}`,assetKey:s.assetKey,durationSeconds,reward:100,budget:100,capacity:1});
 writeFileSync(stateFile,JSON.stringify(s),{mode:0o600});pass('Prepared two hosted test campaigns and captured original profile',{baseline:s.baseline.normal,balance:s.balance,campaigns:Object.fromEntries(Object.entries(s.campaigns).map(([k,v])=>[k,v.id]))});
}else if(step==='active'||step==='verify'){
 const name=process.argv[3];
 let d,p;
 const deadline=Date.now()+35000;
 do {d=await api(pp,'/placements',s.accounts.member.token);p=d.placements.find(p=>p.campaign_id===s.campaigns[name].id);assert.ok(p,'placement exists');if(step!=='verify'||p.state==='ended')break;await new Promise(r=>setTimeout(r,1000));}while(Date.now()<deadline);
 const r=await api(pp,`/placements/${p.id}/receipt`,s.accounts.member.token);writeFileSync(out+`/${name}-receipt.json`,JSON.stringify(r,null,2));
 if(step==='active'){
  assert.equal(p.state,'active');const remote=await placement();assert.equal(remote.placement.placementId||remote.placement.id,p.id);
  const image=await fetch(ai+remote.placement.assetUrl);assert.ok(image.ok);assert.equal('sha256-'+createHash('sha256').update(Buffer.from(await image.arrayBuffer())).digest('hex'),s.assetKey);
  pass(name+': active placement and hosted image bytes match approved creative',{placementId:p.id,coveredMs:r.placement.record.coveredMs});
 }else{
  assert.equal(p.state,'ended');assert.equal(p.record.award,name==='complete'?100:0);assert.equal(p.record.restoration,'restored');assert.equal(r.ledger.length,2);
  assert.equal(p.record.settlement,name==='complete'?'credited_test_only':'released');if(name==='complete')assert.equal(p.record.coveredMs,60000);else assert.ok(p.record.coveredMs<120000);
  const final=await placement();assert.equal(final.placement,null);assert.deepEqual(final.normal,s.baseline.normal);
  assert.equal(d.balance,s.balance+100);
  pass(name+': settlement and exact original profile restored',{placementId:p.id,coveredMs:p.record.coveredMs,requiredMs:p.record.requiredMs,award:p.record.award,observations:r.observations.length,ledgerEntries:r.ledger.length,balance:d.balance});
 }
}else if(step==='cleanup'){
 for(const c of Object.values(s.campaigns))await api(pp,`/placements/campaigns/${c.id}/status`,s.accounts.sponsor.token,'POST',{status:'paused'});
 await api(ai,'/profilepays/grant',s.aiToken,'DELETE');const final=await placement();assert.equal(final.placement,null);assert.deepEqual(final.normal,s.baseline.normal);
 pass('Temporary grant revoked and campaigns paused; original profile preserved',{});
}else throw Error('Unknown step');
