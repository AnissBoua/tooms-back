import AppDataSource from "@/config/typeorm";
import { Request, Response, Router } from "express";
import { User } from "@/models/user";
import { z } from "zod";
import bcrypt from "bcrypt";
import { auth } from "@/middlewares/auth";

const router: Router = Router();
const repository = AppDataSource.getRepository(User);

const ZCreate = () => {
    return (req: Request, res: Response, next: any) => {
        const schema = z.strictObject({
            name: z.string().min(1).max(100),
            lastname: z.string().min(1).max(100),
            email: z.string().email(),
            password: z.string().min(6).max(255),
            avatar: z.string().nullable(),
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

const ZUpdate = () => {
    return (req: Request, res: Response, next: any) => {
        const schema = z.strictObject({
            name: z.string().min(1).max(100),
            lastname: z.string().min(1).max(100),
            email: z.string().email(),
            avatar: z.string().nullable(),
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

const ZID = () => {
    return (req: Request, res: Response, next: any) => {
        const schema = z.object({
            id: z.string().regex(/^\d+$/, "ID must be a numeric string"),
        });

        try {
            schema.parse(req.params);
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

router.get('/', async (req: Request, res: Response) => {
    try {
        const users = await repository.find({ select: ['id', 'name', 'lastname', 'email', 'avatar', 'created_at', 'updated_at'] });
        res.json(users);      
    } catch (error) {
        res.status(500).json({ error });
    }
});

router.get('/:id', [ZID()], async (req: Request, res: Response) => {
    try {
        const user = await repository.findOne({
            where: { id: parseInt(req.params.id) },
            select: ['id', 'name', 'lastname', 'email', 'avatar', 'created_at', 'updated_at'],
        });
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        res.json(user);
    } catch (error) {
        res.status(500).json({ error });
    }
});

router.post('/', ZCreate(), async (req: Request, res: Response) => {
    try {
        const exists = await repository.findOne({ where: { email: req.body.email } });
        if (exists) {
            res.status(400).json({ error: 'Email already exists' });
            return;
        }

        const { password, ...data } = req.body;
        const hash = await bcrypt.hash(password, 10);

        const user = await repository.save({ ...data, password: hash });

        // Remove password from response
        delete user.password;
        res.json(user);
    } catch (error) {
        res.status(500).json({ error });
    }
});

router.put('/:id', [auth, ZID(), ZUpdate()], async (req: any, res: Response) => {
    try {
        const user = await repository.findOneBy({ id: parseInt(req.params.id) });
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        if (req.user.id !== user.id) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }

        // Make sure password is not updated
        // TODO: don't allow to update email
        const { password, ...data } = req.body;
        await repository.update({ id: user.id }, data);

        const updated = await repository.findOne({ 
            where: { id: parseInt(req.params.id) },
            select: ['id', 'name', 'lastname', 'email', 'avatar', 'created_at', 'updated_at'], 
        });
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error });
    }
});

router.delete('/:id', [auth, ZID()], async (req: any, res: Response) => {
    try {
        const user = await repository.findOneBy({ id: parseInt(req.params.id) });
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        if (req.user.id !== user.id) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }

        await repository.delete({ id: user.id });
        res.status(204).json({ message: 'User deleted' });
    } catch (error) {
        res.status(500).json({ error });
    }
});

export { router as users };