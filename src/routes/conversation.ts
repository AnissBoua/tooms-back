import AppDataSource from "@/config/typeorm";
import { Request, Response, Router } from "express";
import { z } from "zod";
import { Conversation } from "@/models/conversation";

const router: Router = Router();
const repository = AppDataSource.getRepository(Conversation);

const validate = () => {
    return (req: Request, res: Response, next: any) => {
        const schema = z.object({
            users: z.array(z.number().int()),
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

router.post('/', validate(), async (req: Request, res: Response) => {
    try {
        const conversation = await repository.save(req.body);
        res.json(conversation);
    } catch (error) {
        res.status(500).json({ error });
    }
});

router.put('/:id/add', validate(), async (req: Request, res: Response) => {
    try {
        const conversation = await repository.findOneBy({ id: parseInt(req.params.id) });
        if (!conversation) {
            res.status(404).json({ error: 'Conversation not found' });
            return;
        }

        const { users } = req.body;
        conversation.participants = [...conversation.participants, ...users];

        await repository.save(conversation);
        res.json(conversation);
    } catch (error) {
        res.status(500).json({ error });
    }
});

router.put('/:id/remove', validate(), async (req: Request, res: Response) => {
    try {
        const conversation = await repository.findOneBy({ id: parseInt(req.params.id) });
        if (!conversation) {
            res.status(404).json({ error: 'Conversation not found' });
            return;
        }

        const { users } = req.body;
        conversation.participants = conversation.participants.filter((user) => !users.includes(user.id));
        await repository.save(conversation);
        res.json(conversation);
    } catch (error) {
        res.status(500).json({ error });
    }
});

router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const conversation = await repository.findOneBy({ id: parseInt(req.params.id) });
        if (!conversation) {
            res.status(404).json({ error: 'Conversation not found' });
            return;
        }

        await repository.delete(conversation);
        res.json({ message: 'Conversation deleted' });
    } catch (error) {
        res.status(500).json({ error });
    }
});

export { router as conversations };