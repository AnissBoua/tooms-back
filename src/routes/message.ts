import AppDataSource from "@/config/typeorm";
import { Request, Response, Router } from "express";
import { z } from "zod";
import { Message } from "@/models/message";
import { auth } from "@/middlewares/auth";
import { User } from "@/models/user";
import { Conversation } from "@/models/conversation";

const router: Router = Router();
const repository = AppDataSource.getRepository(Message);
const ConversationRepo = AppDataSource.getRepository(Conversation);

const ZCreate = () => {
    return (req: Request, res: Response, next: any) => {
        const schema = z.strictObject({
            conversation: z.number().int(),
            content: z.string().min(1),
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
            content: z.string().min(1),
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

router.post('/', [auth, ZCreate()], async (req: Request, res: Response) => {
    try {
        const conversation = await ConversationRepo.findOne({ where: { id: req.body.conversation }, relations: ['participants'] });
        if (!conversation) {
            res.status(404).json({ error: 'Conversation not found' });
            return;
        }

        if (!conversation.participants.some((u: User) => u.id === req.user?.sub)) {
            res.status(403).json({ error: 'You are not part of this conversation' });
            return;
        }

        const data = { ...req.body, user: req.user?.sub };
        const message = await repository.save(data);
        res.json(message);
        // TODO: Send message to conversation with websockets
    } catch (error) {
        res.status(500).json({ error });
    }
});

router.put('/:id', [auth, ZUpdate()], async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        let message = await repository.findOne({ where: { id: Number(req.params.id) }, relations: ['user'] });
        if (!message) {
            res.status(404).json({ error: 'Message not found' });
            return;
        }

        if (message.user.id !== req.user.sub) {
            res.status(403).json({ error: 'You are not the owner of this message' });
            return;
        }

        const content = req.body.content;
        message = await repository.save({ ...message, content });
        res.json(message);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error });
    }
});

router.delete('/:id', [auth], async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        let message = await repository.findOne({ where: { id: Number(req.params.id) }, relations: ['user'] });
        if (!message) {
            res.status(404).json({ error: 'Message not found' });
            return;
        }

        if (message.user.id !== req.user.sub) {
            res.status(403).json({ error: 'You are not the owner of this message' });
            return;
        }

        await repository.delete(message);
        res.json({ message: 'Message deleted' });
    } catch (error) {
        res.status(500).json({ error });
    }
});

export { router as messages };