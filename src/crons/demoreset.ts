import AppDataSource from '@/config/typeorm';
import cron from 'node-cron';
import { seedDemo } from '@/scripts/seed-demo';

// Order matters only in that FK checks are disabled around the whole batch,
// so any table can be truncated regardless of what still references it.
const TABLES = [
    'call',
    'read_receipt',
    'message',
    'conversation_participants_user',
    'user_contacts_user',
    'conversation',
    'refresh_token',
    'token_blacklist',
    'user',
];

export async function resetDemoData() {
    const runner = AppDataSource.createQueryRunner();
    await runner.connect();
    try {
        await runner.query('SET FOREIGN_KEY_CHECKS = 0');
        try {
            for (const table of TABLES) {
                await runner.query(`TRUNCATE TABLE \`${table}\``);
            }
        } finally {
            // Always restore this even if a TRUNCATE throws, since the
            // pooled connection could otherwise be reused with FK checks
            // left off for unrelated queries.
            await runner.query('SET FOREIGN_KEY_CHECKS = 1');
        }
    } finally {
        await runner.release();
    }

    await seedDemo();
}

// Wipes every conversation/user/message a visitor created and restores the two
// seeded demo accounts, so the public demo never accumulates junk data.
// Opt-in via DEMO_RESET so it never runs against a real/dev database by accident.
if (process.env.DEMO_RESET === 'true') {
    cron.schedule('0 0 * * *', async () => {
        try {
            await resetDemoData();
            console.log('Demo reset cron ran: database wiped and reseeded.');
        } catch (error) {
            console.error('Demo reset cron failed:', error);
        }
    });
}
