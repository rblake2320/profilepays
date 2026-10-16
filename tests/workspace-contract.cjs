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
