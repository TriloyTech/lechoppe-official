import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { validateSubmission, transition, language, emailAddress, bookingDate, parisNow, newArrivals } from '../lib/reservations/model.ts';
import { renderReservation, renderReservationTest, sendReservationEmail } from '../lib/email/reservation.ts';
import { submitReservation, changeStatus } from '../lib/reservations/service.ts';
import { workOne, backoffSeconds } from '../lib/reservations/worker.ts';
const now=new Date('2026-09-14T08:00:00Z');
const input=()=>validateSubmission({name:'Test <script>',email:'TEST@example.com',phone:'+33 1 23 45 67 89',notes:'<img src=x>',party_size:40,date:'2026-09-15',time:'19:30',lang:'es',submission_key:randomUUID()},now);
const mail={kind:'received',audience:'customer',id:randomUUID(),name:'<script>alert(1)</script>',email:'test@example.com',phone:'12345',date:'2026-10-25',time:'19:30:00',party_size:2,lang:'en',notes:'<img src=x>',reason:'',contact:'existing address',managementUrl:'https://example.com/admin',staff_notes:'SECRET'};
// Scripted DB responses exercise orchestration/rollback. Real SQL/concurrency is covered separately.
function scripted(steps){const calls=[];const query=async(sql,args=[])=>{calls.push({sql,args});const step=steps.shift();assert.ok(step,`Unexpected SQL: ${sql}`);assert.match(sql,step[0]);if(step[1] instanceof Error)throw step[1];return {rows:step[1]||[],rowCount:(step[1]||[]).length};};return{pool:{query,connect:async()=>({query,release(){}})},calls,done(){assert.equal(steps.length,0);}};}
function env(){process.env.RESEND_API_KEY='mock-only';process.env.RESEND_FROM_EMAIL='test@example.com';process.env.SITE_URL='https://example.com';}
test('validation matches 30-day calendar, slots, integer 1–40, contact lengths and language fallback',()=>{
 assert.equal(input().email,'test@example.com');assert.equal(language('de'),'fr');
 for(const patch of [{name:''},{email:'a@b.com\r\nBcc:evil@example.com'},{party_size:41},{party_size:2.5},{party_size:'2'},{date:'2026-09-31'},{date:'2026-10-14'},{time:'03:00'},{phone:'hello'},{notes:'x'.repeat(2001)},{submission_key:'bad'}])assert.throws(()=>validateSubmission({...input(),...patch},now));
 assert.equal(emailAddress(' A@EXAMPLE.COM '),'a@example.com');assert.throws(()=>emailAddress('a..b@example.com'));
});
test('Paris dates preserve calendar days across DST and browser timezones',()=>{
 assert.deepEqual(parisNow(new Date('2026-03-29T01:30Z')),{date:'2026-03-29',time:'03:30'});
 assert.deepEqual(parisNow(new Date('2026-10-25T01:30Z')),{date:'2026-10-25',time:'02:30'});
 for(const lang of ['fr','en','es','it'])assert.match(bookingDate('2026-10-25','19:30:00',lang),/25.*19:30.*Europe\/Paris/);
});
test('all customer languages distinguish requests, confirmations, decline and cancellation; escape HTML, omit staff notes',()=>{
 for(const lang of ['fr','en','es','it'])for(const kind of ['received','confirmed','declined','cancelled']){const out=renderReservation({...mail,lang,kind,reason:'<b>reason</b>'});assert.ok(out.subject);assert.match(out.html,/&lt;script&gt;/);assert.doesNotMatch(out.html,/<script>|<img|SECRET/);assert.match(out.text,/<script>/);assert.doesNotMatch(out.text,/https:\/\/example.com\/admin/);}
 const restaurant=renderReservation({...mail,audience:'restaurant'});assert.match(restaurant.text,/test@example.com/);assert.match(restaurant.text,/https:\/\/example.com\/admin/);assert.ok(renderReservationTest().text);
});
test('only allowed transitions; repeats do nothing; customer reason required',()=>{
 assert.equal(transition('pending','confirmed',''),'confirmed');assert.equal(transition('pending','cancelled','Full'),'declined');assert.equal(transition('confirmed','cancelled','Closed'),'cancelled');assert.equal(transition('confirmed','confirmed',''),null);assert.equal(transition('cancelled','cancelled',''),null);
 for(const args of [['cancelled','confirmed',''],['confirmed','pending',''],['pending','cancelled',''],['confirmed','cancelled','x'.repeat(1001)]])assert.throws(()=>transition(...args));
});
test('dashboard initial/empty load, first arrival and repeated polls',()=>{
 const row={id:'first'};assert.deepEqual(newArrivals(null,[row]),[]);assert.deepEqual(newArrivals(new Set(),[row]),[row]);assert.deepEqual(newArrivals(new Set(['first']),[row]),[]);
});
test('provider mocked acceptance, idempotency, accurate failures and uncertainty',async()=>{
 env();let request;assert.equal(await sendReservationEmail('a@example.com',renderReservationTest(),'same-key',async(url,options)=>{request=options;return Response.json({id:'provider-1'});}), 'provider-1');assert.equal(request.headers['Idempotency-Key'],'same-key');
 await assert.rejects(sendReservationEmail('a@example.com',renderReservationTest(),'x',async()=>new Response('',{status:429})),/provider_http_429/);
 await assert.rejects(sendReservationEmail('a@example.com',renderReservationTest(),'x',async()=>{throw new Error('secret');}),/^Error: provider_uncertain$/);
 process.env.RESEND_API_KEY='';await assert.rejects(sendReservationEmail('a@example.com',renderReservationTest(),'x',async()=>{throw new Error('must not fetch');}),/provider_missing/);env();
});
function creationSteps(row,settings=[]){return [[/^BEGIN/],[/pg_advisory_xact_lock/],[/pg_advisory_xact_lock/],[/submission_key/,[]],[/pg_advisory_xact_lock/],[/bot_challenge_id/,[]],[/count\(\*\)/,[{count:0}]],[/INSERT INTO reservations/,[row]],[/INSERT INTO reservation_events/,[{id:'event'}]],[/SELECT key,value/,settings],[/INSERT INTO reservation_notifications/],[/INSERT INTO reservation_notifications/],[/^COMMIT/]];}
test('submission saves pending booking and separate jobs; missing recipient records a blocked job',async()=>{
 env();const row={...input(),id:randomUUID(),status:'pending'};const db=scripted(creationSteps(row));assert.equal(await submitReservation(db.pool,row,()=> 'challenge'),row.id);db.done();const jobs=db.calls.filter(c=>c.sql.includes('INSERT INTO reservation_notifications'));assert.equal(jobs.length,2);assert.equal(jobs[0].args[4],'pending');assert.equal(jobs[1].args[4],'blocked');assert.equal(jobs[1].args[5],'recipient_missing');assert.match(db.calls.find(c=>c.sql.includes('INSERT INTO reservations')).sql,/'pending'/);
});
test('duplicate retry returns original reservation without bot replay or new jobs; key mismatch rolls back',async()=>{
 const {createHash}=await import('node:crypto');const value=input(),hash=createHash('sha256').update(JSON.stringify(value)).digest('hex');
 const db=scripted([[/BEGIN/],[/pg_advisory/],[/pg_advisory/],[/submission_key/,[{id:'existing',submission_hash:hash}]],[/COMMIT/]]);assert.equal(await submitReservation(db.pool,value,()=>{throw new Error('must not recheck bot');}),'existing');db.done();
 const conflict=scripted([[/BEGIN/],[/pg_advisory/],[/pg_advisory/],[/submission_key/,[{id:'existing',submission_hash:'different'}]],[/ROLLBACK/]]);await assert.rejects(submitReservation(conflict.pool,value,()=> 'challenge'),/idempotency_conflict/);conflict.done();
});
test('missing provider preserves reservation and records configuration problem',async()=>{
 process.env.RESEND_API_KEY='';const value=input(),db=scripted(creationSteps({...value,id:randomUUID()},[{key:'reservation_notifications',value:{recipient:'staff@example.com'}}]));await submitReservation(db.pool,value,()=> 'challenge');db.done();assert.ok(db.calls.filter(c=>c.sql.includes('INSERT INTO reservation_notifications')).every(c=>c.args[5]==='provider_missing'));env();
});
test('lifecycle locks row and enqueues correct event; repeat action produces no event',async()=>{
 env();for(const [previous,next,kind] of [['pending','confirmed','confirmed'],['pending','cancelled','declined'],['confirmed','cancelled','cancelled']]){
 const db=scripted([[/BEGIN/],[/FOR UPDATE/,[{...input(),id:'r',status:previous}]],[/UPDATE reservations/],[/INSERT INTO reservation_events/,[{id:'e'}]],[/SELECT key,value/,[]],[/INSERT INTO reservation_notifications/],[/COMMIT/]]);await changeStatus(db.pool,'r',next,'Customer reason');db.done();assert.equal(db.calls.find(c=>c.sql.includes('INSERT INTO reservation_events')).args[1],kind);}
 const repeated=scripted([[/BEGIN/],[/FOR UPDATE/,[{status:'confirmed'}]],[/COMMIT/]]);assert.deepEqual(await changeStatus(repeated.pool,'r','confirmed',''),{changed:false});repeated.done();
});
function workerDb(overrides={},current={kind:'received',status:'pending'},ending=[]){return scripted([[/SKIP LOCKED/,[{id:'job',event_id:'event'}]],[/BEGIN/],[/FOR UPDATE OF r/,[current]],[/claim_token=.*FOR UPDATE/,[{id:'job',audience:'customer',recipient:'a@example.com',attempts:1,first_attempt_at:new Date(),payload:{message:renderReservationTest(),from:'sender@example.com'},...overrides}]],[/UPDATE reservation_notifications SET status/],...ending,[/COMMIT/]]);}
test('worker safe claim, immutable provider key, accepted ID, recoverable lease and bounded backoff',async()=>{
 env();const db=workerDb();let args;await workOne(db.pool,async(...a)=>{args=a;return 'provider-id';});db.done();assert.equal(args[2],'reservation/job');const claim=db.calls[0].sql;assert.match(claim,/lease_until<now\(\)/);assert.match(claim,/attempts=attempts\+1/);assert.equal(db.calls.find(c=>c.sql.startsWith('UPDATE reservation_notifications SET status=')&&c.args[1]==='accepted').args[3],'provider-id');assert.equal(backoffSeconds(1),30);assert.equal(backoffSeconds(20),3600);
});
test('worker failure persists sanitized retry; final attempt fails; stale and expired jobs never send',async()=>{
 env();for(const attempts of [1,6]){const db=workerDb({attempts},undefined,[[/next_attempt_at/]]);await workOne(db.pool,async()=>{throw new Error('private secret');});db.done();assert.equal(db.calls.find(c=>c.args[2]==='provider_uncertain').args[1],attempts===6?'failed':'pending');}
 for(const [override,current,status] of [[{}, {kind:'received',status:'confirmed'},'superseded'],[{}, {kind:'confirmed',status:'cancelled'},'superseded'],[{first_attempt_at:new Date(Date.now()-24*3600000)},undefined,'failed']]){const db=workerDb(override,current);await workOne(db.pool,async()=>{assert.fail('must not send');});db.done();assert.ok(db.calls.some(c=>c.args[1]===status));}
});
test('worker handles no jobs and lost claim without delivering',async()=>{
 const empty=scripted([[/SKIP LOCKED/,[]]]);assert.equal(await workOne(empty.pool),false);empty.done();
 const lost=scripted([[/SKIP LOCKED/,[{id:'job',event_id:'event'}]],[/BEGIN/],[/FOR UPDATE OF r/,[{kind:'received',status:'pending'}]],[/claim_token=.*FOR UPDATE/,[]],[/COMMIT/]]);await workOne(lost.pool,async()=>assert.fail());lost.done();
});
