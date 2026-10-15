// Run after production-static-pilot.mjs, with the same process-only test credential.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {randomUUID,randomBytes} from 'node:crypto';
import pg from 'pg';
const dir='.local/production-static', pp='http://127.0.0.1:8940', ai='https://aihangout.ai';
const a=JSON.parse(readFileSync(dir+'/accounts.json')), local=JSON.parse(readFileSync('.local/static-pilot/runtime.json'));
const report={started:new Date().toISOString(),checks:[],errors:[]};
const db=new pg.Client({host:'127.0.0.1',port:5549,user:'placement_test',password:local.db,database:'profilepays_live_pilot'});
let browser,token,c,p,operatorId;
async function api(base,path,auth,method='GET',body,status){const r=await fetch(base+'/api'+path,{method,headers:{'Content-Type':'application/json',...(auth?{Authorization:'Bearer '+auth}:{})},...(body?{body:JSON.stringify(body)}:{})});if(status)assert.equal(r.status,status,path);else assert.ok(r.ok,path+': '+r.status);return r.json();}
async function until(fn,predicate){for(let i=0;i<70;i++){const v=await fn();if(predicate(v))return v;await new Promise(r=>setTimeout(r,500));}throw Error('Timed out');}
const pass=(scenario,measurement={})=>{report.checks.push({outcome:'Worked',scenario,measurement});console.log('Worked:',scenario);};
try{
  await db.connect();
  for(const who of Object.values(a))who.token=(await api(pp,'/auth/login',null,'POST',{email:who.email,password:who.password})).accessToken;
  token=(await api(ai,'/auth/login',null,'POST',{email:'live-countdown-test-20261014@example.invalid',password:process.env.LIVE_PROFILE_TEST_PASSWORD})).token;
  const baseline=await api(ai,'/users/by-username/live_countdown_test/placement');assert.equal(baseline.placement,null);
  const g=await api(ai,'/profilepays/grant',token,'POST'),d=await api(pp,'/placements/destinations',a.member.token,'POST',{code:g.token});
  c=await api(pp,'/placements/campaigns',a.sponsor.token,'POST',{commandKey:randomUUID(),title:'Production direct removal '+Date.now(),assetKey:'blue',durationSeconds:120,reward:100,budget:100,capacity:1});
  browser=await chromium.launch();const profile=await browser.newPage(),old=await browser.newPage({viewport:{width:1280,height:1000}}),owner=await browser.newPage();
  await profile.goto(ai+'/profile/live_countdown_test');await old.goto(ai+'/problem/290');
  await owner.goto(ai+'/login');await owner.getByLabel('Email address').fill('live-countdown-test-20261014@example.invalid');await owner.getByLabel('Password',{exact:true}).fill(process.env.LIVE_PROFILE_TEST_PASSWORD);await owner.getByRole('button',{name:'Sign in',exact:true}).click();await owner.waitForURL(ai+'/');await owner.goto(ai+'/settings');
  p=await api(pp,`/placements/campaigns/${c.id}/join`,a.member.token,'POST',{commandKey:randomUUID(),destinationId:d.id,termsVersion:1,consent:'static-test-v1'});
  const receipt=()=>api(pp,`/placements/${p.id}/receipt`,a.member.token);
  await until(receipt,r=>r.placement.state==='active'&&r.placement.record.coveredMs>5000);
  const selector=`img[data-static-placement="${p.id}"]`;
  await profile.locator(selector).waitFor();await old.locator(selector).first().waitFor();assert.equal(await old.locator(selector).count(),2);
  await owner.screenshot({path:dir+'/direct-removal-settings.png',fullPage:true});
  const began=performance.now();await owner.getByRole('button',{name:'Revoke ProfilePays',exact:true}).click();
  const held=await until(receipt,r=>r.placement.record.settlement==='review_hold');
  await profile.locator(selector).waitFor({state:'detached'});await old.locator(selector).first().waitFor({state:'detached'});
  const restoreMs=Math.round(performance.now()-began),final=await api(ai,'/users/by-username/live_countdown_test/placement');assert.equal(final.placement,null);assert.deepEqual(final.normal,baseline.normal);assert.equal(held.ledger.length,0);assert.equal(held.placement.record.restoration,'restored');
  assert.equal(await old.locator(`img[data-live-profile="${baseline.normal.profileId}"]`).count(),2);
  await old.screenshot({path:dir+'/direct-removal-restored-old-post.png'});writeFileSync(dir+'/direct-removal-hold.json',JSON.stringify(held,null,2));
  pass('Direct AIHangout disconnect removes the image, restores all old avatars, and holds ambiguous settlement',{placementId:p.id,restoreMs,stopReason:held.placement.record.stopReason,ledgerEntries:held.ledger.length});
  // Only the separate local pilot database is used to provision this independent test operator.
  const operator={email:`operator.${Date.now()}@example.invalid`,password:'Pilot1!'+randomBytes(16).toString('hex')};
  const created=await api(pp,'/auth/signup',null,'POST',{...operator,firstName:'Independent',lastName:'Operator',userRole:'member'});operatorId=created.user.id;
  await db.query("UPDATE users SET user_role='admin' WHERE id=$1",[operatorId]);
  const operatorToken=(await api(pp,'/auth/login',null,'POST',operator)).accessToken;
  await api(pp,`/placements/${p.id}/review`,a.member.token,'POST',{award:0,reason:'Self review prohibited'},403);
  const page=await browser.newPage({viewport:{width:1280,height:1000}});await page.goto(pp+'/login');await page.getByLabel('Email address').fill(operator.email);await page.getByLabel('Password',{exact:true}).fill(operator.password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.locator('nav').getByRole('link',{name:'Review queue',exact:true}).waitFor();await page.goto(pp+'/reviews');
  await page.locator('.pp-row').filter({hasText:c.terms.title}).getByRole('button',{name:'Inspect evidence'}).click();await page.getByLabel('Test-credit award').fill('0');await page.getByLabel('Review reason').fill('Live test profile disconnected before its required end time; restore original and release test credits.');await page.getByRole('button',{name:'Record review decision'}).click();await page.getByText('Review recorded. The test ledger has been settled.').waitFor();
  const resolved=await receipt();assert.equal(resolved.placement.record.award,0);assert.equal(resolved.placement.record.settlement,'released');assert.equal(resolved.ledger.length,2);
  await api(pp,`/placements/${p.id}/review`,operatorToken,'POST',{award:0,reason:'Duplicate decision control'},409);
  await page.screenshot({path:dir+'/direct-removal-operator-settled.png',fullPage:true});writeFileSync(dir+'/direct-removal-receipt.json',JSON.stringify(resolved,null,2));
  pass('Independent operator resolves direct removal to zero test credits exactly once',{award:0,ledgerEntries:2,duplicateStatus:409,selfReviewStatus:403});
}catch(e){report.errors.push(e.message);console.error(e.stack);process.exitCode=1;}
finally{
  if(token)try{await api(ai,'/profilepays/grant',token,'DELETE');}catch(e){report.errors.push(e.message);process.exitCode=1;}
  if(c)try{await api(pp,`/placements/campaigns/${c.id}/status`,a.sponsor.token,'POST',{status:'paused'});}catch(e){report.errors.push(e.message);process.exitCode=1;}
  if(operatorId)await db.query("UPDATE users SET user_role='member' WHERE id=$1",[operatorId]);
  await db.end();await browser?.close();report.finished=new Date().toISOString();writeFileSync(dir+'/revocation-results.json',JSON.stringify(report,null,2));
}
