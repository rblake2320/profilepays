import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
const origin='https://profilepays.ultrarag.app',out='.local/qa-remediation';mkdirSync(out,{recursive:true});
const report={at:new Date().toISOString(),checks:[]};
const pass=(scenario,measurement)=>{report.checks.push({outcome:'Worked',scenario,measurement});console.log('Worked:',scenario);writeFileSync(out+'/api-results.json',JSON.stringify(report,null,2));};
async function api(path,body,token){const r=await fetch(origin+'/api'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};}
const account={email:`qa.company.${Date.now()}@example.invalid`,password:'Company1!'+randomBytes(16).toString('hex'),firstName:'QA',lastName:'Advertiser',userRole:'advertiser',companyName:'  QA & Company  '};
for(const companyName of [undefined,'   ','x'.repeat(201),{name:'bad'}]){const r=await api('/auth/signup',{...account,companyName});assert.equal(r.status,400);assert.ok(r.data.fieldErrors.companyName);}
pass('Missing, blank, oversized and object company names rejected safely',{cases:4});
const signup=await api('/auth/signup',account);assert.equal(signup.status,201);assert.equal(signup.data.user.companyName,'QA & Company');
writeFileSync(out+'/advertiser.json',JSON.stringify(account),{mode:0o600});
const login=await api('/auth/login',{email:account.email,password:account.password});assert.equal(login.status,200);assert.equal(login.data.user.companyName,'QA & Company');
const me=await api('/users/me',null,login.data.accessToken);assert.equal(me.status,200);assert.equal(me.data.companyName,'QA & Company');
pass('Advertiser company survives signup, fresh login and profile read',{companyName:me.data.companyName});
const html=await fetch(origin+'/');const text=await html.text();assert.match(html.headers.get('cache-control'),/no-transform/);assert.ok(!text.includes('static.cloudflareinsights.com'));
assert.match(html.headers.get('content-security-policy'),/script-src 'self';/);
pass('Edge beacon omitted while self-only CSP remains enforced',{cacheControl:html.headers.get('cache-control')});
const iconPath=text.match(/rel="icon"[^>]*href="([^"]+)"/)[1];const icon=await fetch(origin+iconPath);assert.equal(icon.status,200);assert.match(icon.headers.get('content-type'),/image\/svg\+xml/);assert.match(await icon.text(),/<svg/);
pass('Document favicon resolves to deployed SVG',{path:iconPath,status:icon.status});
