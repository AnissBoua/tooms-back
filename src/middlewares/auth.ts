import { NextFunction } from "express";
import { JWT } from "@/services/jwt";
import { TokenBlacklist } from "@/models/tokenblacklist";
import AppDataSource from "@/config/typeorm";

const blacklistRepo = AppDataSource.getRepository(TokenBlacklist);
const auth = async (req: any, res: any, next: NextFunction) => {
    const token = req.header('Authorization');
    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }
    try {
        const decoded = JWT.verify(token);
        if (!decoded.sub) {
            res.status(400).json({ error: 'Invalid token.' });
            return;
        }

        const blacklist = await blacklistRepo.findOne({ where: { jwtid: decoded.jti } });
        if (blacklist) {
            res.status(401).json({ error: 'Access denied. Token revoked.' });
            return;
        }
        req.user = decoded;
        next();
    } catch (error) {
        console.error(error);
        res.status(400).json({ error: 'Invalid token.' });
    }
}

export { auth };