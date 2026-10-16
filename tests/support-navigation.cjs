// Regression: changing only the URL fragment must replace the grant without a reload.
const {JSDOM}=require('jsdom');
const dom=new JSDOM('<div id="root"></div>',{url:'https://example.invalid/support/view'});
global.window=dom.window;global.document=dom.window.document;
Object.defineProperty(global,'navigator',{value:dom.window.navigator,configurable:true});
global.localStorage=dom.window.localStorage; global.IS_REACT_ACT_ENVIRONMENT=true;
require('ts-node').register({project:'backend/tsconfig.json',transpileOnly:true,compilerOptions:{jsx:'react-jsx'}});
require.extensions['.css']=()=>{};
const {createRequire}=require('node:module');
const frontendRequire=createRequire(require('node:path').resolve('frontend/package.json'));
const React=frontendRequire('react');
const Module=require('node:module'),originalLoad=Module._load;
const ReactCache={'react':React};
ReactCache['react/jsx-runtime']=frontendRequire('react/jsx-runtime');
ReactCache['react/jsx-dev-runtime']=frontendRequire('react/jsx-dev-runtime');
Module._load=function(name,...rest){return ReactCache[name]||originalLoad.call(this,name,...rest);};
const {createRoot}=frontendRequire('react-dom/client');
const {act}=React;
const {MemoryRouter,useNavigate}=require('react-router-dom');
const Page=require('../frontend/src/pages/SupportPage').default;
const assert=require('node:assert/strict');
const calls=[];
global.fetch=async(url,options)=>{calls.push({url,authorization:options.headers.Authorization});return {ok:true,json:async()=>({frame:null,capturedAt:null,expiresAt:Date.now()+900000,status:'waiting'})};};
let navigate;
function Driver(){navigate=useNavigate();return React.createElement(Page,{mode:'view'});}
const root=createRoot(document.getElementById('root'));
const first='/support/view#session=11111111-1111-1111-1111-111111111111&key='+'A'.repeat(43);
const second='/support/view#session=22222222-2222-2222-2222-222222222222&key='+'B'.repeat(43);
(async()=>{
  try {
    await act(async()=>root.render(React.createElement(MemoryRouter,{initialEntries:[first]},React.createElement(Driver))));
    assert.equal(calls[0].authorization,'Bearer '+'A'.repeat(43));
    await act(async()=>navigate(second));
    assert.equal(calls.at(-1).authorization,'Bearer '+'B'.repeat(43));
    assert.ok(calls.at(-1).url.includes('22222222'));
    console.log('Worked: same-tab fragment navigation replaces old connection and bearer grant');
  } finally {await act(async()=>root.unmount());dom.window.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
