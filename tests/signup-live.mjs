import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {mkdirSync,writeFileSync} from 'node:fs';
const origin='https://profilepays.ultrarag.app';
const out='.local/signup-fix';mkdirSync(out,{recursive:true});
const report={at:new Date().toISOString(),origin,checks:[]};
const pass=(scenario,measurement)=>{report.checks.push({outcome:'Worked',scenario,measurement});console.log('Worked:',scenario);};
async function call(path,body){
  const r=await fetch(origin+'/api'+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});
  return {status:r.status,data:await r.json()};
}
const account={email:`signup.regression.${Date.now()}@example.invalid`,password:'Signup1#'+randomBytes(16).toString('hex'),firstName:' José ',lastName:'O’Neil',userRole:'member'};
for(const [scenario,change,field] of [
  ['Invalid email names its field',{email:'not-an-email'},'email'],
  ['Incomplete password names its requirements',{password:'alllower123!'},'password'],
  ['Blank name names its field',{firstName:'   '},'firstName'],
  ['Invalid name has a useful explanation',{lastName:'<script>'},'lastName'],
  ['Administrator signup remains forbidden',{userRole:'admin'},'userRole'],
  ['Unknown privileges remain forbidden',{isAdmin:true},'isAdmin'],
]){
  const body={...account,...change};const r=await call('/auth/signup',body);
  assert.equal(r.status,400);assert.equal(typeof r.data.fieldErrors?.[field],'string');
  assert.notEqual(r.data.message,'Bad Request');assert.ok(!JSON.stringify(r.data).includes(body.password));
  pass(scenario,{status:r.status,field,message:r.data.fieldErrors[field]});
}
const signup=await call('/auth/signup',{...account,email:` ${account.email} `});
assert.equal(signup.status,201);assert.equal(signup.data.user.email,account.email);assert.equal(signup.data.user.firstName,'José');assert.equal(signup.data.user.lastName,'O’Neil');
pass('Valid participant signup accepts email whitespace, Unicode names and a # symbol',{status:signup.status});
writeFileSync(out+'/api-account.json',JSON.stringify(account),{mode:0o600});
const duplicate=await call('/auth/signup',account);assert.equal(duplicate.status,409);assert.match(duplicate.data.message,/already exists/);
pass('Duplicate email explains the conflict',{status:duplicate.status,message:duplicate.data.message});
const login=await call('/auth/login',{email:` ${account.email} `,password:account.password});assert.equal(login.status,200);
const dashboard=await fetch(origin+'/api/placements',{headers:{Authorization:'Bearer '+login.data.accessToken}});
assert.equal(dashboard.status,200);const data=await dashboard.json();assert.equal(data.balance,0);
pass('New participant signs in and loads the real marketplace',{status:dashboard.status,balance:data.balance});
writeFileSync(out+'/api-results.json',JSON.stringify(report,null,2));
