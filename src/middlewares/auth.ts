import { NextFunction } from "express";
import { JWT } from "@/services/jwt";
import { TokenBlacklist } from "@/models/tokenblacklist";
import AppDataSource from "@/config/typeorm";

const blacklistRepo = AppDataSource.getRepository(TokenBlacklist);
const auth = async (req: any, res: any, next: NextFunction) => {
    const token = req.header('Authorization');
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized.' });
    }
    try {
        const decoded = JWT.verify(token);
        if (!decoded) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const blacklist = await blacklistRepo.findOne({ where: { jwtid: decoded.jti } });
        if (blacklist) {
            res.status(401).json({ error: 'Unauthorized.' });
            return;
        }
        req.user = decoded;
        next();
    } catch (error) {
        console.error(error);
        res.status(401).json({ error: 'Unauthorized.' });
    }
}

export { auth };