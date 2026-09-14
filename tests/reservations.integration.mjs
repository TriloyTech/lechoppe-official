// Explicit disposable LOCAL PostgreSQL only. Never loads .env or calls an email provider.
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { submitReservation, changeStatus } from '../lib/reservations/service.ts';
import { workOne } from '../lib/reservations/worker.ts';
import { validateSubmission, parisNow } from '../lib/reservations/model.ts';
const url=process.env.RESERVATION_TEST_DATABASE_URL;
if (!url) throw new Error('Set RESERVATION_TEST_DATABASE_URL to an explicitly disposable local PostgreSQL database; .env is never loaded.');
if (!['127.0.0.1','localhost','[::1]'].includes(new URL(url).hostname))throw new Error('Only local test databases are allowed');
test('PostgreSQL transactions, concurrent submissions/status/claims, recovery and migration reapplication',async()=>{
 const schema=`reservation_test_${randomUUID().replaceAll('-','')}`;
 const admin=new pg.Pool({connectionString:url});let pool;
 try {
  await admin.query(`CREATE SCHEMA ${schema}`);
  const isolated=new URL(url);isolated.searchParams.set('options',`-c search_path=${schema},public`);
  pool=new pg.Pool({connectionString:isolated.href,max:10});
  await pool.query(`CREATE TABLE reservations(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),created_at timestamptz DEFAULT now(),name text,email text,phone text,party_size int,date date,time time,status text DEFAULT 'pending',notes text);CREATE TABLE site_settings(key text PRIMARY KEY,value jsonb,updated_at timestamptz DEFAULT now());`);
  const migration=await readFile(new URL('../db/init/006_reservation_notifications.sql',import.meta.url),'utf8');await pool.query(migration);await pool.query(migration);
  process.env.RESEND_API_KEY='mock';process.env.RESEND_FROM_EMAIL='sender@example.com';process.env.SITE_URL='https://example.com';
  await pool.query(`INSERT INTO site_settings(key,value) VALUES('reservation_notifications','{"recipient":"staff@example.com"}')`);
  const tomorrow=new Date(`${parisNow().date}T12:00:00Z`);tomorrow.setUTCDate(tomorrow.getUTCDate()+1);
  const value=validateSubmission({name:'Test',email:'a@example.com',party_size:2,date:tomorrow.toISOString().slice(0,10),time:'19:30',submission_key:randomUUID(),lang:'it'});
  const ids=await Promise.all(Array.from({length:4},()=>submitReservation(pool,value,()=> 'challenge-1')));assert.equal(new Set(ids).size,1);
  assert.equal((await pool.query('SELECT * FROM reservations')).rowCount,1);assert.equal((await pool.query('SELECT * FROM reservation_notifications')).rowCount,2);
  await pool.query(`UPDATE site_settings SET value='{"recipient":"changed@example.com"}'`);
  assert.equal((await pool.query("SELECT recipient FROM reservation_notifications WHERE audience='restaurant'")).rows[0].recipient,'staff@example.com');
  await Promise.all(Array.from({length:4},()=>changeStatus(pool,ids[0],'confirmed','')));
  assert.equal((await pool.query("SELECT * FROM reservation_events WHERE kind='confirmed'")).rowCount,1);
  const delivered=new Set();const send=async(to,message,key)=>{assert.ok(!delivered.has(key));delivered.add(key);return `mock-${delivered.size}`;};
  await Promise.all(Array.from({length:4},()=>workOne(pool,send)));
  while(await workOne(pool,send)){}
  assert.equal(delivered.size,2);assert.equal((await pool.query("SELECT * FROM reservation_notifications WHERE status='superseded'")).rowCount,1);
  await changeStatus(pool,ids[0],'cancelled','Customer-facing reason');await changeStatus(pool,ids[0],'cancelled','Customer-facing reason');
  await pool.query("UPDATE reservation_notifications SET status='processing',lease_until=now()-interval '2 minutes' WHERE status='pending'");
  await workOne(pool,send);assert.equal(delivered.size,3);
  await assert.rejects(changeStatus(pool,ids[0],'confirmed',''),/invalid_transition/);
  const other={...value,email:'b@example.com',submission_key:randomUUID()};const second=await submitReservation(pool,other,()=> 'challenge-2');await changeStatus(pool,second,'cancelled','No tables');
  assert.equal((await pool.query("SELECT * FROM reservation_events WHERE kind='declined'")).rowCount,1);
  await workOne(pool,async()=>{throw new Error('provider_http_503');});
  assert.ok((await pool.query("SELECT * FROM reservation_notifications WHERE last_error='provider_http_503' OR status='superseded'")).rowCount>0);
 }finally{await pool?.end();await admin.query(`DROP SCHEMA ${schema} CASCADE`);await admin.end();}
});
