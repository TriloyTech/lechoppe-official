import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createRequire } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
const require=createRequire(import.meta.url);
const {NextRequest}=require('next/server.js');
const calls=[];
const pool={query:async(sql,args)=>{calls.push({sql,args});return {rows:[],rowCount:0};}};
const cache=new Map();
// Compile the real route handlers with only the database mocked. No network/email provider calls.
function load(path){path=resolve(path);if(cache.has(path))return cache.get(path).exports;const module={exports:{}};cache.set(path,module);
 const code=ts.transpileModule(readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
 const localRequire=(id)=>{
  if(id==='@/lib/postgres/db')return {pool,assertAllowedTable:(table)=>{if(!['reservations','site_settings','menu_items'].includes(table))throw new Error('Table not allowed');}};
  if(id==='next/server')return require('next/server.js');
  if(id.startsWith('@/')||id.startsWith('.')){let p=id.startsWith('@/')?resolve(id.slice(2)):resolve(dirname(path),id);if(!existsSync(p))p+='.ts';return load(p);}
  return require(id);
 };
 vm.runInThisContext(`(function(require,module,exports){${code}\n})`,{filename:path})(localRequire,module,module.exports);return module.exports;
}
const auth=load('lib/admin/auth.ts');
const origin='http://localhost:4999';
const request=(path,method='GET',body,authed=false,siteOrigin=origin)=>new NextRequest(origin+path,{method,headers:{...(method!=='GET'?{'Content-Type':'application/json',origin:siteOrigin}:{}),...(authed?{cookie:`lechoppe_admin_auth=${auth.createAdminSessionToken()}`}:{})},...(body?{body:JSON.stringify(body)}:{})});
test('all dedicated settings/status/test/retry handlers deny unauthenticated and cross-origin mutations before database access',async()=>{
 for(const [file,method] of [['app/api/admin/reservation-notifications/route.ts','GET'],['app/api/admin/reservation-notifications/route.ts','PUT'],['app/api/admin/reservation-notifications/test/route.ts','POST'],['app/api/admin/reservation-notifications/retry/route.ts','POST'],['app/api/admin/reservations/[id]/status/route.ts','POST'],['app/api/admin/reservations/route.ts','GET']]){
  const handler=load(file)[method],ctx={params:Promise.resolve({id:'00000000-0000-0000-0000-000000000001'})};const before=calls.length;
  assert.equal((await handler(request('/api/admin/check',method,method==='GET'?undefined:{}),ctx)).status,401);
  if(method!=='GET')assert.equal((await handler(request('/api/admin/check',method,{},true,'https://evil.example'),ctx)).status,403);
  assert.equal(calls.length,before);
 }
});
test('generic reservation insertion, update and deletion are blocked even for admins',async()=>{
 const route=load('app/api/db/[table]/route.ts');
 for(const method of ['POST','PATCH','DELETE'])for(const admin of [false,true])assert.equal((await route[method](request('/api/db/reservations',method,{},admin),{params:Promise.resolve({table:'reservations'})})).status,404);
});
test('private settings/outbox cannot be publicly read and broad admin generic reads exclude recipient',async()=>{
 const route=load('app/api/db/[table]/route.ts');
 for(const table of ['reservation_notifications','reservation_events','reservation_notification_test_limits'])assert.ok((await route.GET(request(`/api/db/${table}`),{params:Promise.resolve({table})})).status>=400);
 const query='?filters='+encodeURIComponent(JSON.stringify([{column:'key',op:'eq',value:'reservation_notifications'}]));assert.equal((await route.GET(request('/api/db/site_settings'+query),{params:Promise.resolve({table:'site_settings'})})).status,404);
 await route.GET(request('/api/db/site_settings','GET',undefined,true),{params:Promise.resolve({table:'site_settings'})});assert.match(calls.at(-1).sql,/key <> 'reservation_notifications'/);
 assert.equal((await route.POST(request('/api/db/site_settings','POST',{key:'reservation_notifications',value:{}},true),{params:Promise.resolve({table:'site_settings'})})).status,403);
});
test('settings reject header injection, allow explicit clearing, and test rate limit does not send',async()=>{
 const settings=load('app/api/admin/reservation-notifications/route.ts');
 assert.equal((await settings.PUT(request('/api/admin/check','PUT',{recipient:'x@example.com\r\nBcc:evil@example.com'},true))).status,400);
 assert.equal((await settings.PUT(request('/api/admin/check','PUT',{recipient:''},true))).status,200);assert.equal(JSON.parse(calls.at(-1).args[1]).recipient,'');
 const endpoint=load('app/api/admin/reservation-notifications/test/route.ts');assert.equal((await endpoint.POST(request('/api/admin/check','POST',{},true))).status,429);
});
test('settings accept the local external port while Next runs on the container port',async()=>{
 const settings=load('app/api/admin/reservation-notifications/route.ts');
 const req=new NextRequest('http://localhost:3000/api/admin/reservation-notifications',{method:'PUT',headers:{origin:'http://localhost:4321',host:'localhost:4321','sec-fetch-site':'same-origin',cookie:`lechoppe_admin_auth=${auth.createAdminSessionToken()}`,'content-type':'application/json'},body:JSON.stringify({recipient:'lechoppe.restaurant@gmail.com'})});
 assert.equal((await settings.PUT(req)).status,200);
});
test('settings accept a trusted production HTTPS origin and ignore untrusted forwarding headers',async()=>{
 const settings=load('app/api/admin/reservation-notifications/route.ts');
 const previous=process.env.TRUST_PROXY_HEADERS; process.env.TRUST_PROXY_HEADERS='true';
 try {
  const valid=new NextRequest('http://localhost:3000/api/admin/reservation-notifications',{method:'PUT',headers:{origin:'https://lechoppe.example',host:'localhost:3000','x-forwarded-host':'lechoppe.example','x-forwarded-proto':'https','sec-fetch-site':'same-origin',cookie:`lechoppe_admin_auth=${auth.createAdminSessionToken()}`,'content-type':'application/json'},body:JSON.stringify({recipient:'lechoppe.restaurant@gmail.com'})});
  assert.equal((await settings.PUT(valid)).status,200);
  process.env.TRUST_PROXY_HEADERS='false';
  const crossForwarded=new NextRequest('http://localhost:3000/api/admin/reservation-notifications',{method:'PUT',headers:{origin:'https://lechoppe.example',host:'localhost:3000','x-forwarded-host':'lechoppe.example','x-forwarded-proto':'https','sec-fetch-site':'same-origin',cookie:`lechoppe_admin_auth=${auth.createAdminSessionToken()}`,'content-type':'application/json'},body:JSON.stringify({recipient:'lechoppe.restaurant@gmail.com'})});
  assert.equal((await settings.PUT(crossForwarded)).status,403);
 } finally { if(previous===undefined)delete process.env.TRUST_PROXY_HEADERS; else process.env.TRUST_PROXY_HEADERS=previous; }
});
test('settings reject invalid email, cross-site mutations, and unauthenticated mutations',async()=>{
 const settings=load('app/api/admin/reservation-notifications/route.ts');
 const make=(headers,body={recipient:'bad'})=>new NextRequest('http://localhost:3000/api/admin/reservation-notifications',{method:'PUT',headers:{origin:'http://localhost:4321',host:'localhost:4321','sec-fetch-site':'same-origin',...headers,'content-type':'application/json'},body:JSON.stringify(body)});
 assert.equal((await settings.PUT(make({cookie:`lechoppe_admin_auth=${auth.createAdminSessionToken()}`}))).status,400);
 assert.equal((await settings.PUT(make({cookie:`lechoppe_admin_auth=${auth.createAdminSessionToken()}`,'sec-fetch-site':'cross-site'}))).status,403);
 assert.equal((await settings.PUT(make({}))).status,401);
});
