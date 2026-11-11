import { workOne } from './worker.ts';
import { createAdminClient } from '../supabase/server.ts';

const client = createAdminClient();
let stopping = false;
process.on('SIGTERM', () => { stopping = true; });
process.on('SIGINT', () => { stopping = true; });

while (!stopping) {
  try {
    if (await workOne(client)) continue;
  } catch (e) {
    console.error('Reservation worker database operation failed; retrying.', e);
  }
  await new Promise(resolve => setTimeout(resolve, 2000));
}
