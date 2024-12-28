import AppDataSource from "@/config/typeorm";
import { User } from "@/models/user";
import { Request, Response, Router } from "express";
import { z } from "zod";
import bcrypt from "bcrypt";
import { JWT } from "@/services/jwt";
import { RefreshToken } from "@/models/refreshtoken";
import { IsNull, MoreThan } from "typeorm";
import { TokenBlacklist } from "@/models/tokenblacklist";
import { auth } from "@/middlewares/auth";

const router: Router = Router();
const repository = AppDataSource.getRepository(User);
const refreshRepository = AppDataSource.getRepository(RefreshToken);
const blacklistRepository = AppDataSource.getRepository(TokenBlacklist);

const ZLogin = () => {
    return (req: Request, res: Response, next: any) => {
        const schema = z.strictObject({
            email: z.string().email(),
            password: z.string().min(8).max(255),
        });

        try {
            schema.parse(req.body);
            return next();
        } catch (error) {
            return res.status(400).json({
                error: (error as z.ZodError).errors.map((e: any) => {
                    return { field: e.path.join('.'), message: e.message };
                }),
            });
        }
    }
}

const ZRegister = () => {
    return (req: Request, res: Response, next: any) => {
        const schema = z.strictObject({
            name: z.string().min(1).max(255),
            lastname: z.string().min(1).max(255),
            email: z.string().email(),
            password: z.string().min(8).max(255),
        });

        try {
            schema.parse(req.body);
            return next();
        } catch (error) {
            return res.status(400).json({
                error: (error as z.ZodError).errors.map((e: any) => {
                    return { field: e.path.join('.'), message: e.message };
                }),
            });
        }
    }
}

// Refresh Token Automatic Reuse Detection : https://auth0.com/blog/refresh-tokens-what-are-they-and-when-to-use-them/
const RTARD = async (user: User) => {
    try {
        const refreshes = await refreshRepository.find({ where: { user: user } });
        await refreshRepository.update({ user: user}, { revoked_at: new Date() });

        const blacklist = [];
        for (let refresh of refreshes) {
            const token = new TokenBlacklist();
            token.jwtid = refresh.jwtid; // Access Token JWT ID
            token.expires_at = refresh.expires_at;
            blacklist.push(token);
        }

        await blacklistRepository.save(blacklist);
        // TODO: Send email to admin
    } catch (error) {
        console.error('Error revoking refresh tokens:', error);
    }
}

router.post("/login", [ZLogin()], async (req: Request, res: Response) => {
    try {
        let user = await repository.findOne({ where: { email: req.body.email }, select: ['id', 'password'] });
        if (!user) {
            res.status(400).json({ error: "Invalid credentials" });
            return;
        }
    
        const valid = await bcrypt.compare(req.body.password, user.password);
        if (!valid) {
            res.status(400).json({ error: "Invalid credentials" });
            return;
        }
    
        const token = JWT.sign(user, 60 * 60);
        const refresh = new RefreshToken();
        refresh.token = JWT.sign(user, 60 * 60 * 24 * 7);
        refresh.jwtid = JWT.verify(token).jti;
        refresh.user = user;
        refresh.expires_at = new Date(JWT.verify(refresh.token).exp * 1000);
        await refreshRepository.save(refresh);

        res.json({
            token: token,
            refresh: refresh.token,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error });
    }
});

router.get("/whoami", [auth], async (req: Request, res: Response) => {
    const token = req.header('Authorization');
    if (!token) {
        res.status(401).json({ error: 'Access denied. No token provided.' });
        return;
    }
    try {
        const decoded = JWT.verify(token);
        if (!decoded) {
            res.status(401).json({ error: 'Invalid token.' });
            return;
        }

        let user = await repository.findOne({ where: { id: decoded.sub }, select: ['id', 'name', 'lastname', 'email', 'avatar', 'created_at', 'updated_at'] });
        res.json(user);
    } catch (error) {
        res.status(401).json({ error: 'Invalid token.' });
    }
});

router.post("/register", [ZRegister()], async (req: Request, res: Response) => {
    try {
        const exists = await repository.findOne({ where: { email: req.body.email } });
        if (exists) {
            res.status(400).json({ error: 'User already exists' });
            return;
        }

        const data = {
            name: req.body.name,
            lastname: req.body.lastname,
            email: req.body.email,
            password: req.body.password,
        }

        data.password = await bcrypt.hash(data.password, 10);
        let user = repository.create(data);
        user = await repository.save(user);

        const token = JWT.sign(user, 60 * 60);
        const refresh = new RefreshToken();
        refresh.token = JWT.sign(user, 60 * 60 * 24 * 7);
        refresh.jwtid = JWT.verify(token).jti;
        refresh.user = user;
        refresh.expires_at = new Date(JWT.verify(refresh.token).exp * 1000);
        await refreshRepository.save(refresh);

        res.json({ 
            token, 
            refresh 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error });
    }
});

router.post("/refresh", async (req: Request, res: Response) => {
    try {
        let refresh = req.body.refresh;
        if (!refresh) {
            res.status(401).json({ error: 'Unauthorized.' });
            return;
        }

        refresh = await refreshRepository.findOne({ where: { token: refresh, expires_at: MoreThan(new Date()), revoked_at: IsNull() }, relations: { user: true } });
        if (!refresh) {
            res.status(400).json({ error: 'Invalid token.' });
            return;
        }

        if (refresh.used_at) {
            RTARD(refresh.user);
            res.status(401).json({ error: 'Unauthorized.' });
            return;
        }

        refresh.used_at = new Date();
        await refreshRepository.update(refresh.id, { used_at: refresh.used_at });
        
        const token = JWT.sign(refresh.user, 60 * 60);
        const updated = new RefreshToken();
        updated.token = JWT.sign(refresh.user, JWT.expires(new Date(refresh.expires_at)));
        updated.jwtid = JWT.verify(token).jti;
        updated.user = refresh.user;
        updated.expires_at = refresh.expires_at;
        await refreshRepository.save(updated);

        res.json({ 
            token: token, 
            refresh: updated.token
        });

    } catch (error) {
        res.status(400).json({ error: 'Invalid token.' });
    }
});

export { router as auth };