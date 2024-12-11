import AppDataSource from '@/config/typeorm';
import { RefreshToken } from '@/models/refreshtoken';
import { TokenBlacklist } from '@/models/tokenblacklist';
import cron from 'node-cron';
import { LessThan } from 'typeorm';

const repository = AppDataSource.getRepository(RefreshToken);
const blacklistRepo = AppDataSource.getRepository(TokenBlacklist);

cron.schedule('0 0 * * *', async () => {
    try {
        const result = await repository.delete({ expires_at: LessThan(new Date()) });
        console.log(`Cron job ran: ${result.affected} records deleted.`);

        const blacklisted = await blacklistRepo.delete({ expires_at: LessThan(new Date()) });
        console.log(`Cron job ran: ${blacklisted.affected} blacklisted tokens deleted.`);
    } catch (error) {
        console.error(error);        
    }
});