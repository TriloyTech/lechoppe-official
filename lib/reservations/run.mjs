import pg from 'pg';
import { workOne } from './worker.ts';
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL required');
const pool = new pg.Pool({connectionString:process.env.DATABASE_URL,max:3});
let stopping=false;
process.on('SIGTERM',()=>{stopping=true;});
process.on('SIGINT',()=>{stopping=true;});
while (!stopping) {
 try { if (await workOne(pool)) continue; }
 catch { console.error('Reservation worker database operation failed; retrying.'); }
 await new Promise(resolve=>setTimeout(resolve,2000));
}
await pool.end();
