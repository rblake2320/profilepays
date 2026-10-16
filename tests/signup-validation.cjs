require('ts-node').register({project:'backend/tsconfig.json',transpileOnly:true});
require('reflect-metadata');
const assert=require('node:assert/strict');
const {SignupDto}=require('../backend/src/auth/dto/signup.dto');
const {LoginDto}=require('../backend/src/auth/dto/login.dto');
const {inputValidationPipe}=require('../backend/src/common/input-validation');
const {signupSchema}=require('../frontend/src/validation/signup');
const {authError}=require('../frontend/src/utils/authError');
const pipe=inputValidationPipe();
const base={email:'new@example.invalid',firstName:'Test',lastName:'Member',password:'ValidPass1!',userRole:'member'};
const validate=b=>pipe.transform(b,{type:'body',metatype:SignupDto});
let checks=0;
async function rejects(body,field){
  await assert.rejects(()=>validate(body),e=>{
    const r=e.getResponse();assert.equal(e.getStatus(),400);assert.equal(typeof r.fieldErrors[field],'string');
    assert.notEqual(r.message,'Bad Request');assert.ok(!JSON.stringify(r).includes(body.password));
    assert.ok(!('target' in r)&&!('value' in r));return true;
  });checks++;
}
(async()=>{
  const normalized=await validate({...base,email:' new@example.invalid ',firstName:' José ',lastName:'O’Neil'});
  assert.equal(normalized.email,'new@example.invalid');assert.equal(normalized.firstName,'José');assert.equal(normalized.lastName,'O’Neil');checks++;
  const login=await pipe.transform({email:' new@example.invalid ',password:' unchanged '},{type:'body',metatype:LoginDto});
  assert.equal(login.email,'new@example.invalid');assert.equal(login.password,' unchanged ');checks++;
  for(const password of ['ValidPass1!','ValidPass1#','Auto-Generated9','alllower123!','ALLUPPER123!','NoNumber!','NoSymbol123','Aa1!','A'.repeat(126)+'a1!']){
    const b={...base,password};
    const client=await signupSchema.isValid({...b,userType:'member',confirmPassword:password});
    let server=true;try{await validate(b);}catch{server=false;}
    assert.equal(client,server,'Browser/server password policy mismatch');checks++;
  }
  for (const companyName of [undefined, '', '   ', 'x'.repeat(201), {name:'Bad'}]) {
    await rejects({...base,userRole:'advertiser',companyName},'companyName');
  }
  const advertiser=await validate({...base,userRole:'advertiser',companyName:'  QA & Co.  '});
  assert.equal(advertiser.companyName,'QA & Co.');checks++;
  const clientAdvertiser=await signupSchema.validate({...base,userType:'advertiser',companyName:'  QA & Co.  ',confirmPassword:base.password});
  assert.equal(clientAdvertiser.companyName,advertiser.companyName);checks++;
  await rejects({...base,password:'alllower123!'},'password');
  await rejects({...base,email:'not-an-email'},'email');
  await rejects({...base,firstName:'   '},'firstName');
  await rejects({...base,lastName:'<script>'},'lastName');
  await rejects({...base,userRole:'admin'},'userRole');
  await rejects({...base,admin:true},'admin');
  await rejects({...base,email:{value:'new@example.invalid'}},'email');
  for(const [err,needle] of [
    [{response:{status:400,data:{message:'Bad Request'}}},'account details'],
    [{response:{status:400,data:{fieldErrors:{email:'Enter a valid email address'}}}},'valid email'],
    [{response:{status:409,data:{message:'An account with this email already exists'}}},'already exists'],
    [{response:{status:400,data:{message:['First issue','Second issue']}}},'First issue Second issue'],
    [{response:{status:429,data:{message:'ThrottlerException: Too Many Requests'}}},'wait a minute'],
    [{},'connection'],
  ]){assert.ok(authError(err,'Failed').message.includes(needle));checks++;}
  assert.equal(await signupSchema.isValid({...base,userType:'member',confirmPassword:'mismatch'}),false);checks++;
  console.log(`Worked: ${checks} signup validation, normalization, policy parity and safe-error checks`);
})().catch(e=>{console.error(e);process.exitCode=1;});
