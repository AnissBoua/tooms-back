import AppDataSource from "@/config/typeorm";
import { Request, Response, Router } from "express";
import { User } from "@/models/user";
import { z } from "zod";
const router: Router = Router();
const repository = AppDataSource.getRepository(User);

const validate = () => {
    return (req: Request, res: Response, next: any) => {
        const schema = z.object({
            id: z.number()
        });

        try {
            schema.parse(req.params);
            return next();
        } catch (error) {
            return res.status(400).json({
                error: (error as z.ZodError).errors?.map((e: any) => e.message) || "Invalid input",
            });
        }
    }
}

router.get('/', (req: Request, res: Response) => {
    repository.find().then(users => {
        res.json(users);
    }).catch(error => {
        res.status(500).json({ error });
    });
});

router.get('/:id', [validate()], (req: Request, res: Response) => {
    repository.findOneBy({ id: parseInt(req.params.id) }).then(user => {
        res.json(user);
    }).catch(error => {
        res.status(500).json({ error });
    });
});

export { router as users };