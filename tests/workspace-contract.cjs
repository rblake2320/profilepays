global.localStorage={getItem:()=>null,setItem:()=>{},removeItem:()=>{}};
require('ts-node').register({project:'backend/tsconfig.json',transpileOnly:true,compilerOptions:{jsx:'react-jsx'}});
require.extensions['.css']=()=>{};
const {createRequire}=require('node:module');
const frontendRequire=createRequire(require('node:path').resolve('frontend/package.json'));
const React=frontendRequire('react');
// Resolve all test providers to the application's React, even in a hoisted workspace.
const Module=require('node:module'),originalLoad=Module._load;
Module._load=function(name,...rest){if(name==='react')return React;return originalLoad.call(this,name,...rest);};
const assert=require('node:assert/strict');
const {renderToStaticMarkup}=frontendRequire('react-dom/server');
const {Provider}=require('react-redux'),{createStore}=require('redux');
const {MemoryRouter}=require('react-router-dom');
const Layout=require('../frontend/src/components/layout/AppLayout').default;
const Guard=require('../frontend/src/components/common/ProtectedRoute').default;
function render(component,userType){const store=createStore(()=>({auth:{user:userType?{userType,firstName:'QA'}:null}}));return renderToStaticMarkup(React.createElement(Provider,{store},React.createElement(MemoryRouter,null,component)));}
const advertiser=render(React.createElement(Layout),'advertiser');
for(const path of ['/connections','/earnings','/placements'])assert.ok(!advertiser.includes(`href="${path}"`));
assert.ok(advertiser.includes('Campaign studio'));
const member=render(React.createElement(Layout),'member');for(const path of ['/connections','/earnings','/placements'])assert.ok(member.includes(`href="${path}"`));
for(const role of ['member','advertiser',null]){const markup=render(React.createElement(Guard,{allowedRoles:['member','admin']},React.createElement('span',null,'PARTICIPANT CONTENT')),role);assert.equal(markup.includes('PARTICIPANT CONTENT'),role==='member');}
console.log('Worked: advertiser navigation omits member workflows; member navigation remains; role guard rejects advertiser and anonymous content');
for(const role of ['member','advertiser','admin',null]){
  const markup=render(React.createElement(Guard,{allowedRoles:['admin']},React.createElement('span',null,'ADMIN CONTENT')),role);
  assert.equal(markup.includes('ADMIN CONTENT'),role==='admin');
}
assert.ok(render(React.createElement(Layout),'admin').includes('Administrator'));
console.log('Worked: administrator route and navigation require administrator role');
const Report=require('../frontend/src/components/AgreementReport').default;
const report=render(React.createElement(Report,{placements:[{id:'test-contract',username:'participant',record:{terms:{title:'<script>invalid</script>',durationSeconds:300},notification:{title:'Agreement broken',type:'agreement_broken',occurredAt:1792116000000,withheld:100},startsAt:1792115856290,endsAt:1792116156290,coveredMs:150000,award:0,restoration:'restored',settlement:'released'}}]}),'advertiser');
assert.ok(report.includes('2026-10-16T02:00:00.000Z'));
assert.ok(report.includes('Agreement broken'));
assert.ok(report.includes('100<!-- --> withheld') || report.includes('100 withheld'));
assert.ok(!report.includes('<script>'));
assert.ok(report.includes('Test credits have no cash value'));
console.log('Worked: printable report retains UTC breach time, withheld credits and escapes campaign text');
