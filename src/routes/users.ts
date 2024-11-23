import AppDataSource from "@/config/typeorm";
import { Request, Response, Router } from "express";
import { User } from "@/models/user";
import { z } from "zod";
import bcrypt from "bcrypt";

const router: Router = Router();
const repository = AppDataSource.getRepository(User);

const validate = () => {
    return (req: Request, res: Response, next: any) => {
        const schema = z.object({
            name: z.string().min(3).max(100),
            lastname: z.string().min(3).max(100),
            email: z.string().email(),
            password: z.string().min(6).max(255),
            avatar: z.string(),
        });

        try {
            schema.parse(req.body);
            return next();
        } catch (error) {
            return res.status(400).json({
                error: (error as z.ZodError).errors?.map((e: any) => {
                    return { field: e.path.join('.'), message: e.message };
                }) || "Invalid input",
            });
        }
    }
}

router.get('/', async (req: Request, res: Response) => {
    try {
        const users = await repository.find();
        res.json(users);      
    } catch (error) {
        res.status(500).json({ error });
    }
});

router.get('/:id', async (req: Request, res: Response) => {
    try {
        const user = await repository.findOneBy({ id: parseInt(req.params.id) });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error });
    }
});

router.post('/', validate(), async (req: Request, res: Response) => {
    try {
        const { password, ...data } = req.body;
        const hash = await bcrypt.hash(password, 10);

        const user = await repository.save({ ...data, password: hash });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error });
    }
});

router.put('/:id', validate(), async (req: Request, res: Response) => {
    try {
        const user = await repository.findOneBy({ id: parseInt(req.params.id) });
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        const { password, ...data } = req.body;
        await repository.update(user, data);
        res.json(user);
    } catch (error) {
        res.status(500).json({ error });
    }
});

router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const user = await repository.findOneBy({ id: parseInt(req.params.id) });
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        await repository.delete(user);
        res.json({ message: 'User deleted' });
    } catch (error) {
        res.status(500).json({ error });
    }
});

export { router as users };