// Isolated local test-credit coordinator for the explicitly approved AIHangout live pilot.
// Does not replace the ordinary local demonstration on 8930-8932.
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync, openSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import pg from 'pg';
const root = resolve(import.meta.dirname, '..'), dir = resolve(root, '.local/production-static');
mkdirSync(dir, {recursive:true});
const local = JSON.parse(readFileSync(resolve(root,'.local/static-pilot/runtime.json')));
const db = new pg.Client({host:'127.0.0.1',port:5549,user:'placement_test',password:local.db,database:'postgres'});
await db.connect();
if (!(await db.query("SELECT 1 FROM pg_database WHERE datname='profilepays_live_pilot'")).rowCount) await db.query('CREATE DATABASE profilepays_live_pilot');
await db.end();
const secretFile=resolve(dir,'runtime.json');
if(!existsSync(secretFile)) writeFileSync(secretFile,JSON.stringify({jwt:randomBytes(32).toString('hex'),key:randomBytes(32).toString('hex')}),{mode:0o600});
const secrets=JSON.parse(readFileSync(secretFile));
const env={HOST:'127.0.0.1',PORT:'8933',NODE_ENV:'test',DB_HOST:'127.0.0.1',DB_PORT:'5549',DB_USERNAME:'placement_test',DB_PASSWORD:local.db,DB_NAME:'profilepays_live_pilot',JWT_SECRET:secrets.jwt,PLACEMENT_KEY:secrets.key,PLACEMENT_MIGRATE:'true',PROFILEPAYS_TEST_ENABLED:'true',PROFILEPAYS_SHORT_TESTS:'true',AIHANGOUT_ORIGIN:'https://aihangout.ai',FRONTEND_URL:'http://127.0.0.1:8940'};
const children=[];
function child(name,args,cwd,extra) { const log=openSync(resolve(dir,name+'.log'),'a'); const p=spawn(process.execPath,args,{cwd,env:{...process.env,...extra},stdio:['ignore',log,log],windowsHide:true}); children.push(p); p.on('exit',code=>console.log(name+' exited '+code));return p; }
child('backend',[resolve(root,'backend/dist/src/main.js')],resolve(root,'backend'),env);
child('frontend',[resolve(root,'node_modules/vite/bin/vite.js'),'preview','--host','127.0.0.1','--port','8940','--strictPort'],resolve(root,'frontend'),{API_PROXY_TARGET:'http://127.0.0.1:8933'});
writeFileSync(resolve(dir,'processes.json'),JSON.stringify({runner:process.pid,children:children.map(p=>p.pid)}));
function stop(){ for(const p of children) if(p.exitCode===null) spawnSync('taskkill',['/PID',String(p.pid),'/T','/F'],{stdio:'ignore',windowsHide:true});process.exit(); }
process.on('SIGINT',stop);process.on('SIGTERM',stop);
console.log('Production destination pilot: http://127.0.0.1:8940 — test credits only');
