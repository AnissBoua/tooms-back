import AppDataSource from "@/config/typeorm";
import { Request, Response, Router } from "express";
import { z } from "zod";
import { Conversation } from "@/models/conversation";
import { auth } from "@/middlewares/auth";
import { User } from "@/models/user";
import { In } from "typeorm";
import { Message } from "@/models/message";

const router: Router = Router();
const repository = AppDataSource.getRepository(Conversation);
const UserRepo = AppDataSource.getRepository(User);
const MessageRepo = AppDataSource.getRepository(Message);

const ZCreate = () => {
    return (req: Request, res: Response, next: any) => {
        const schema = z.strictObject({
            name: z.string().optional(),
            users: z.array(z.number().int()),
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

const ZValidate = () => {
    return (req: Request, res: Response, next: any) => {
        const schema = z.strictObject({
            users: z.array(z.number().int()),
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

router.get('/', [auth], async (req: any, res: Response) => {
    try {
        const user = await UserRepo.findOne({ where: {id: req.user.sub}, relations: { conversations: { participants: true } } });
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        const data = user.conversations.map(conversation => ({
            ...conversation,
            messages: [], // Add empty messages array
        }));

        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error });
    }
});

router.get('/:id/messages', [auth], async (req: any, res: Response) => {
    try {
        const conversation = await repository.findOne({ where: { id: parseInt(req.params.id) }, relations: { participants: true } });
        if (!conversation) {
            res.status(404).json({ error: 'Conversation not found' });
            return;
        }

        const exist = conversation.participants.findIndex((user: User) => user.id === req.user.sub);
        if (exist === -1) {
            res.status(403).json({ error: 'You are not allowed to see this conversation' });
            return;
        }

        const page = req.query.page ? parseInt(req.query.page as string) : 1;
        const limit = 50;
        const offset = (page - 1) * limit;
        const messages = await MessageRepo.find({ where: { conversation: conversation }, relations: { user: true, conversation: true }, take: limit, skip: offset, order: { id: 'DESC' } });

        // Flip the messages array
        messages.reverse();
        res.json(messages);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error });
    }
});

router.post('/', [auth, ZCreate()], async (req: any, res: Response) => {
    try {
        if (!req.body.users.includes(req.user.sub)) req.body.users.push(req.user.sub); // Add the user to the conversation
        
        const users = await UserRepo.findBy({ id: In(req.body.users) });
        if (users.length !== req.body.users.length) {
            res.status(400).json({ error: 'Some users were not found' });
            return;
        }

        const conversation = await repository.save({ 
            name: req.body.name || null, 
            participants: users 
        });
        res.json(conversation);
    } catch (error) {
        res.status(500).json({ error });
    }
});

router.put('/:id/add', [auth, ZValidate()], async (req: any, res: Response) => {
    try {
        const conversation = await repository.findOne({ where: { id: parseInt(req.params.id) }, relations: ['participants'] });
        if (!conversation) {
            res.status(404).json({ error: 'Conversation not found' });
            return;
        }

        const exist = conversation.participants.findIndex((user: User) => user.id === req.user.sub);
        if (exist === -1) {
            res.status(403).json({ error: 'You are not allowed to delete this conversation' });
            return;
        }

        const users = await UserRepo.findBy({ id: In(req.body.users) });
        if (users.length !== req.body.users.length) {
            res.status(400).json({ error: 'Some users were not found' });
            return;
        }

        conversation.participants = [...conversation.participants, ...users].filter((value, index, self) => {
            return self.findIndex(user => user.id === value.id) === index;
        });
        await repository.save(conversation);
        res.json(conversation);
    } catch (error) {
        res.status(500).json({ error });
    }
});

router.put('/:id/remove', [auth, ZValidate()], async (req: any, res: Response) => {
    try {
        const conversation = await repository.findOne({ where: {id: parseInt(req.params.id)}, relations: ['participants'] });
        if (!conversation) {
            res.status(404).json({ error: 'Conversation not found' });
            return;
        }

        const exist = conversation.participants.findIndex((user: User) => user.id === req.user.sub);
        if (exist === -1) {
            res.status(403).json({ error: 'You are not allowed to delete this conversation' });
            return;
        }

        let { users } = req.body;
        users = await UserRepo.findBy({ id: In(users) });
        if (users.length !== req.body.users.length) {
            res.status(400).json({ error: 'Some users were not found' });
            return;
        }

        conversation.participants = conversation.participants.filter((user: User) => {
            return !users.some((u: User) => u.id === user.id);
        });
        await repository.save(conversation);
        res.json(conversation);
    } catch (error) {
        res.status(500).json({ error });
    }
});

router.delete('/:id', [auth], async (req: any, res: Response) => {
    try {
        const conversation = await repository.findOne({ where: { id: parseInt(req.params.id) }, relations: ['participants'] });
        if (!conversation) {
            res.status(404).json({ error: 'Conversation not found' });
            return;
        }

        const exist = conversation.participants.findIndex((user: User) => user.id === req.user.sub);
        if (exist === -1) {
            res.status(403).json({ error: 'You are not allowed to delete this conversation' });
            return;
        }

        await repository.delete({ id: conversation.id });
        res.json({ message: 'Conversation deleted' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error });
    }
});

export { router as conversations };