import AppDataSource from "@/config/typeorm";
import { Request, Response, Router } from "express";
import { z } from "zod";
import { Conversation } from "@/models/conversation";
import { auth } from "@/middlewares/auth";
import { User } from "@/models/user";
import { In, MoreThan, Not } from "typeorm";
import { Message } from "@/models/message";
import { ReadReceipt } from "@/models/readreceipt";
import { Call } from "@/models/call";
import WS from "@/websocket";

const router: Router = Router();
const repository = AppDataSource.getRepository(Conversation);
const UserRepo = AppDataSource.getRepository(User);
const MessageRepo = AppDataSource.getRepository(Message);
const ReadReceiptRepo = AppDataSource.getRepository(ReadReceipt);
const CallRepo = AppDataSource.getRepository(Call);

const readReceipts = async (conversationId: number) => {
    const receipts = await ReadReceiptRepo.find({ where: { conversation: { id: conversationId } }, relations: { user: true } });
    return receipts.map(r => ({ user: r.user.id, last_read_at: r.last_read_at }));
}

const unreadCount = async (conversationId: number, userId: number) => {
    const mine = await ReadReceiptRepo.findOne({ where: { user: { id: userId }, conversation: { id: conversationId } } });
    return MessageRepo.count({
        where: {
            conversation: { id: conversationId },
            user: { id: Not(userId) },
            ...(mine ? { created_at: MoreThan(mine.last_read_at) } : {}),
        },
    });
}

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

router.get('/', [auth], async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const user = await UserRepo.findOne({ where: {id: req.user.sub}, relations: { conversations: { participants: true } } });
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        const data = await Promise.all(user.conversations.map(async conversation => {
            const lastMessage = await MessageRepo.findOne({
                where: { conversation: { id: conversation.id } },
                relations: { user: true },
                order: { id: 'DESC' },
            });

            return {
                ...conversation,
                messages: [], // Add empty messages array
                lastMessage: lastMessage ?? null,
                unread: await unreadCount(conversation.id, req.user!.sub),
                readReceipts: await readReceipts(conversation.id),
            };
        }));

        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error });
    }
});

router.get('/:id', [auth], async (req: Request, res: Response) => {
    try {
        const conversation = await repository.findOne({ where: { id: parseInt(req.params.id) }, relations: { participants: true } });
        if (!conversation) {
            res.status(404).json({ error: 'Conversation not found' });
            return;
        }

        const exist = conversation.participants.findIndex((user: User) => user.id === req.user?.sub);
        if (exist === -1) {
            res.status(403).json({ error: 'You are not allowed to see this conversation' });
            return;
        }

        const messageCount = await MessageRepo.count({ where: { conversation: { id: conversation.id } } });
        const calls = await CallRepo.find({ where: { conversation: { id: conversation.id } }, relations: { initiator: true }, order: { started_at: 'ASC' } });

        const data = {
            ...conversation,
            messages: [], // Add empty messages array
            messageCount,
            unread: await unreadCount(conversation.id, req.user!.sub),
            readReceipts: await readReceipts(conversation.id),
            calls,
            callCount: calls.length,
        };

        res.json(data);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error });
    }
});

router.put('/:id/read', [auth], async (req: Request, res: Response) => {
    try {
        const conversation = await repository.findOne({ where: { id: parseInt(req.params.id) }, relations: { participants: true } });
        if (!conversation) {
            res.status(404).json({ error: 'Conversation not found' });
            return;
        }

        const exist = conversation.participants.findIndex((user: User) => user.id === req.user?.sub);
        if (exist === -1) {
            res.status(403).json({ error: 'You are not allowed to see this conversation' });
            return;
        }

        const now = new Date();
        const existing = await ReadReceiptRepo.findOne({ where: { user: { id: req.user!.sub }, conversation: { id: conversation.id } } });
        if (existing) {
            await ReadReceiptRepo.update(existing.id, { last_read_at: now });
        } else {
            await ReadReceiptRepo.save({ user: { id: req.user!.sub }, conversation: { id: conversation.id }, last_read_at: now });
        }

        WS.broadcastRead(conversation.id, req.user!.sub, now);

        res.json({ last_read_at: now });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error });
    }
});

router.get('/:id/messages', [auth], async (req: Request, res: Response) => {
    try {
        const conversation = await repository.findOne({ where: { id: parseInt(req.params.id) }, relations: { participants: true } });
        if (!conversation) {
            res.status(404).json({ error: 'Conversation not found' });
            return;
        }

        const exist = conversation.participants.findIndex((user: User) => user.id === req.user?.sub);
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

router.post('/', [auth, ZCreate()], async (req: Request, res: Response) => {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

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

router.put('/:id/add', [auth, ZValidate()], async (req: Request, res: Response) => {
    try {
        const conversation = await repository.findOne({ where: { id: parseInt(req.params.id) }, relations: ['participants'] });
        if (!conversation) {
            res.status(404).json({ error: 'Conversation not found' });
            return;
        }

        const exist = conversation.participants.findIndex((user: User) => user.id === req.user?.sub);
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

router.put('/:id/remove', [auth, ZValidate()], async (req: Request, res: Response) => {
    try {
        const conversation = await repository.findOne({ where: {id: parseInt(req.params.id)}, relations: ['participants'] });
        if (!conversation) {
            res.status(404).json({ error: 'Conversation not found' });
            return;
        }

        const exist = conversation.participants.findIndex((user: User) => user.id === req.user?.sub);
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

router.delete('/:id', [auth], async (req: Request, res: Response) => {
    try {
        const conversation = await repository.findOne({ where: { id: parseInt(req.params.id) }, relations: ['participants'] });
        if (!conversation) {
            res.status(404).json({ error: 'Conversation not found' });
            return;
        }

        const exist = conversation.participants.findIndex((user: User) => user.id === req.user?.sub);
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