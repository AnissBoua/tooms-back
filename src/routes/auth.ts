import AppDataSource from "@/config/typeorm";
import { User } from "@/models/user";
import { Request, Response, Router } from "express";
import { z } from "zod";
import bcrypt from "bcrypt";
import { JWT } from "@/services/jwt";

const router: Router = Router();
const repository = AppDataSource.getRepository(User);

const ZLogin = () => {
    return (req: Request, res: Response, next: any) => {
        const schema = z.strictObject({
            email: z.string().email(),
            password: z.string().min(1).max(255),
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

router.post("/login", [ZLogin()], async (req: Request, res: Response) => {
    try {
        let user = await repository.findOne({ where: { email: req.body.email }, select: ['id', 'password'] });
        if (!user) {
            res.status(400).json({ error: "Invalid credentials" });
            return;
        }
    
        console.log(user);
        console.log(req.body.password);
        const valid = await bcrypt.compare(req.body.password, user.password);
        if (!valid) {
            res.status(400).json({ error: "Invalid credentials" });
            return;
        }
    
        const token = JWT.sign(user);
        res.json({
            token
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error });
    }
});

router.get("/whoami", async (req: Request, res: Response) => {
    const token = req.header('Authorization');
    if (!token) {
        res.status(401).json({ error: 'Access denied. No token provided.' });
        return;
    }
    try {
        const decoded = JWT.verify(token);
        let user = await repository.findOne({ where: { id: decoded.id }, select: ['id', 'name', 'lastname', 'email', 'avatar', 'created_at', 'updated_at'] });
        res.json(user);
    } catch (error) {
        res.status(400).json({ error: 'Invalid token.' });
    }
});

export { router as auth };