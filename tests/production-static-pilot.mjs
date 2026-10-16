// Explicitly authorized live AIHangout test identity; coordinator may be local or the hosted pilot.
// Never creates public posts. Always revokes the temporary connection in finally.
import { chromium, webkit, devices } from 'playwright';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
const ai='https://aihangout.ai', pp=process.env.PROFILEPAYS_TEST_ORIGIN || 'http://127.0.0.1:8940';
assert.ok(['http://127.0.0.1:8940','https://profilepays.ultrarag.app'].includes(pp),'Unexpected pilot origin');
const username='live_countdown_test', liveId='d7d3e530-9b0b-4b54-a162-31dbc7445f3a';
const out=pp.startsWith('https:')?'.local/public-pilot/acceptance':'.local/production-static', accountFile=out+'/accounts.json';
mkdirSync(out,{recursive:true});
const password=process.env.LIVE_PROFILE_TEST_PASSWORD;
assert.ok(password,'Supply LIVE_PROFILE_TEST_PASSWORD in process memory');
const report={started:new Date().toISOString(),dashboardOrigin:pp,profile:ai+'/profile/'+username,olderPost:ai+'/problem/290',checks:[],errors:[]};
const campaigns=[], placements=[];
let aiToken, accounts, browser, mobile, baseline;
const pass=(scenario,measurement={})=>{report.checks.push({outcome:'Worked',scenario,measurement});console.log('Worked:',scenario);writeFileSync(out+'/results.json',JSON.stringify(report,null,2));};
async function api(base,path,token,method='GET',body){
  const r=await fetch(base+'/api'+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(10000)});
  assert.ok(r.ok,`${method} ${path}: HTTP ${r.status}`);return r.json();
}
async function until(fn,predicate,ms=65000){const end=Date.now()+ms;let v;do{v=await fn();if(predicate(v))return v;await new Promise(r=>setTimeout(r,500));}while(Date.now()<end);throw Error('Condition timed out');}
async function login(page,who){await page.goto(pp+'/login');await page.getByLabel('Email address').fill(who.email);await page.getByLabel('Password',{exact:true}).fill(who.password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.locator('nav').getByRole('link',{name:'Connections',exact:true}).waitFor();}
const receipt=p=>api(pp,`/placements/${p.id}/receipt`,accounts.member.token);
const normal=`img[data-live-profile="${liveId}"]`;
async function ready(page,count){await page.waitForFunction(({s,n})=>{const a=[...document.querySelectorAll(s)];return a.length===n&&a.every(i=>i.naturalWidth===128);},{s:normal,n:count});}
async function motion(page){const frames=[];for(let n=0;n<3;n++){frames.push(createHash('sha256').update(await page.locator(normal).first().screenshot()).digest('hex'));await page.waitForTimeout(1600);}assert.ok(new Set(frames).size>=2,'Original countdown must visibly advance');return new Set(frames).size;}
try{
  const auth=await api(ai,'/auth/login',null,'POST',{email:'live-countdown-test-20261014@example.invalid',password});
  assert.equal(auth.user.username,username);aiToken=auth.token;
  baseline=await api(ai,`/users/by-username/${username}/placement`);
  assert.equal(baseline.normal.key,liveId);assert.equal(baseline.placement,null);
  writeFileSync(out+'/baseline.json',JSON.stringify(baseline,null,2));
  if(existsSync(accountFile))accounts=JSON.parse(readFileSync(accountFile));
  else{accounts={};for(const [name,role] of [['sponsor','advertiser'],['member','member']]){
    const who={email:`${name}.${Date.now()}@example.invalid`,password:'Pilot1!'+randomBytes(16).toString('hex')};
    const signup=await api(pp,'/auth/signup',null,'POST',{...who,firstName:'Pilot',lastName:name==='sponsor'?'Sponsor':'Member',userRole:role,...(role==='advertiser'?{companyName:'Pilot Sponsor'}:{})});
    accounts[name]={...who,id:signup.user.id};
  }writeFileSync(accountFile,JSON.stringify(accounts),{mode:0o600});}
  for(const who of Object.values(accounts))who.token=(await api(pp,'/auth/login',null,'POST',{email:who.email,password:who.password})).accessToken;
  const initialDashboard=await api(pp,'/placements',accounts.member.token);
  assert.equal(initialDashboard.origin,ai);
  const grant=await api(ai,'/profilepays/grant',aiToken,'POST');
  browser=await chromium.launch();mobile=await webkit.launch();
  const participant=await browser.newPage({viewport:{width:1280,height:1000}});
  await login(participant,accounts.member);
  await participant.goto(pp+'/connections');
  await participant.getByLabel('AIHangout connection code').fill(grant.token);
  await participant.getByRole('button',{name:'Connect profile',exact:true}).click();
  await participant.getByText('@'+username,{exact:true}).waitFor();
  const dest=(await api(pp,'/placements',accounts.member.token)).destinations.find(d=>d.username===username);
  assert.ok(dest);
  const viewer=await browser.newPage({viewport:{width:1280,height:950}}), older=await browser.newPage({viewport:{width:1280,height:1050}});
  const phone=await (await mobile.newContext({...devices['iPhone 13'],timezoneId:'America/Chicago'})).newPage();
  await viewer.goto(report.profile);await older.goto(report.olderPost);await phone.goto(report.profile);
  await ready(viewer,1);await ready(older,2);await ready(phone,1);
  await viewer.screenshot({path:out+'/profile-before.png'});await older.screenshot({path:out+'/older-post-before.png'});
  pass('Original production profile and both older post avatars are the existing live countdown',{profileId:liveId,oldAvatars:2});
  // Upload the previously approved bundled test artwork through the creative normalization path.
  const creative=await api(pp,'/placements/creatives',accounts.sponsor.token,'POST',{name:'Approved test image',png:readFileSync('tests/fixtures/placement.png').toString('base64')});
  for(const scenario of ['complete','early-stop']){
    const duration=scenario==='complete'?45:120,title=`Production ${scenario} ${Date.now()}`;
    const c=await api(pp,'/placements/campaigns',accounts.sponsor.token,'POST',{commandKey:randomUUID(),title,assetKey:creative.asset_key,durationSeconds:duration,reward:100,budget:100,capacity:1});campaigns.push(c.id);
    await participant.goto(pp+'/confirmation?campaign='+c.id);
    await participant.getByLabel('Destination profile').selectOption({label:username});
    assert.equal(await participant.getByRole('button',{name:'Reserve placement'}).isDisabled(),true);
    await participant.getByLabel('I approve this temporary image and accept the test-credit terms.').check();
    const began=performance.now();await participant.getByRole('button',{name:'Reserve placement'}).click();
    const dashboard=await until(()=>api(pp,'/placements',accounts.member.token),d=>d.placements.some(p=>p.campaign_id===c.id&&p.state==='active'));
    const p=dashboard.placements.find(p=>p.campaign_id===c.id);placements.push(p);
    const selector=`img[data-static-placement="${p.id}"]`;
    for(const page of [viewer,older,phone])await page.locator(selector).first().waitFor();
    assert.equal(await older.locator(selector).count(),2);
    for(const page of [viewer,older,phone])await page.waitForFunction(s=>[...document.querySelectorAll(s)].every(i=>i.complete&&i.naturalWidth===128),selector);
    const updateMs=Math.round(performance.now()-began);
    const state=await api(ai,`/users/by-username/${username}/placement`);
    const image=await fetch(ai+state.placement.assetUrl);assert.ok(image.ok);
    assert.equal(createHash('sha256').update(Buffer.from(await image.arrayBuffer())).digest('hex'),creative.asset_key.slice(7));
    await viewer.screenshot({path:out+`/${scenario}-active-profile.png`});await older.screenshot({path:out+`/${scenario}-active-old-post.png`});await phone.screenshot({path:out+`/${scenario}-active-iphone.png`});
    pass(scenario+': opt-in updates already-open profile, older question and answer, and mobile WebKit',{placementId:p.id,updateMs,oldAvatars:2,imageHash:creative.asset_key});
    if(scenario==='complete'){
      const session=await viewer.context().newCDPSession(viewer);await session.send('Emulation.setTimezoneOverride',{timezoneId:'Asia/Tokyo'});
      await viewer.clock.setSystemTime(new Date(Date.now()+86400000));
      await viewer.waitForTimeout(3500);assert.equal(await viewer.locator(selector).count(),1);
      pass('Time zone and device-clock change keep the server-controlled placement active',{zone:'Asia/Tokyo',clockShiftHours:24,physicalPhone:false});
    }else{
      await until(()=>receipt(p),r=>r.placement.record.coveredMs>=5000);
      await participant.goto(pp+'/placements');
      await participant.getByTestId('placement-'+p.id).getByRole('button',{name:'Stop and restore',exact:true}).click();
      await participant.getByText('Stopping early earns zero test credits.').waitFor();
      p.stopBegan=performance.now();await participant.getByRole('button',{name:'Confirm stop and restore'}).click();
    }
    const final=await until(()=>receipt(p),r=>r.placement.state==='ended');
    assert.equal(final.placement.record.award,scenario==='complete'?100:0);
    assert.equal(final.placement.record.restoration,'restored');assert.equal(final.ledger.length,2);
    assert.equal(final.placement.record.settlement,scenario==='complete'?'credited_test_only':'released');
    if(scenario==='complete')assert.equal(final.placement.record.coveredMs,duration*1000);
    for(const page of [viewer,older,phone])await page.locator(selector).first().waitFor({state:'detached'});
    await ready(viewer,1);await ready(older,2);await ready(phone,1);
    const restoreMs=scenario==='early-stop'?Math.round(performance.now()-p.stopBegan):null;
    const restored=await api(ai,`/users/by-username/${username}/placement`);
    assert.equal(restored.placement,null);assert.deepEqual(restored.normal,baseline.normal);
    await viewer.screenshot({path:out+`/${scenario}-restored-profile.png`});await older.screenshot({path:out+`/${scenario}-restored-old-post.png`});
    const movingFrames=await motion(viewer);await motion(older);
    writeFileSync(out+`/${scenario}-receipt.json`,JSON.stringify(final,null,2));
    await participant.goto(pp+'/placements');
    await participant.getByTestId('placement-'+p.id).getByRole('button',{name:'View receipt'}).click();
    await participant.getByText('Placement receipt',{exact:true}).waitFor();await participant.screenshot({path:out+`/${scenario}-receipt.png`,fullPage:true});
    pass(scenario+': verified settlement and original countdown restored without reload',{placementId:p.id,coveredMs:final.placement.record.coveredMs,requiredMs:final.placement.record.requiredMs,award:final.placement.record.award,ledgerEntries:final.ledger.length,restoreMs,movingFrames,observations:final.observations.length});
  }
  assert.equal((await api(pp,'/placements',accounts.member.token)).balance,initialDashboard.balance+100);
  pass('Test-credit balance equals 100 completed-placement credits plus zero early-removal credits');
}catch(e){report.errors.push(e.message);console.error(e.stack);process.exitCode=1;}
finally{
  for(const p of placements)try{await api(pp,`/placements/${p.id}/stop`,accounts.member.token,'POST');}catch(e){report.errors.push('cleanup stop: '+e.message);process.exitCode=1;}
  if(aiToken)try{await api(ai,'/profilepays/grant',aiToken,'DELETE');const final=await api(ai,`/users/by-username/${username}/placement`);assert.equal(final.placement,null);assert.deepEqual(final.normal,baseline.normal);pass('Cleanup revoked the temporary grant and preserved the original production profile');}catch(e){report.errors.push('cleanup: '+e.message);process.exitCode=1;}
  for(const id of campaigns)try{await api(pp,`/placements/campaigns/${id}/status`,accounts.sponsor.token,'POST',{status:'paused'});}catch(e){report.errors.push('pause: '+e.message);process.exitCode=1;}
  report.finished=new Date().toISOString();writeFileSync(out+'/results.json',JSON.stringify(report,null,2));await browser?.close();await mobile?.close();
}
