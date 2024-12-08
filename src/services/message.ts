import AppDataSource from "@/config/typeorm";
import { Message } from "@/models/message";
import { z } from "zod";
const repository = AppDataSource.getRepository(Message);

interface Msg {
    conversation: number;
    content: string;
    user: number;
}

const ZValidate = (msg: Msg) => {
    const schema = z.strictObject({
        conversation: z.number().int(),
        content: z.string().min(1),
        user: z.number().int(),
    });

    try {
        schema.parse(msg);
        return true;
    } catch (error) {
        return false;
    }
}

class MessageService {
    static async create(msg: Msg) {
        if (!ZValidate(msg)) {
            throw new Error('Invalid message');
        }
        const data: any = { ...msg }; // To avoid type errors
        let message = await repository.save(data);
        message = await repository.findOne({ where: { id: message.id }, relations: { user: true, conversation: true } });
        return message;
    }
}


export { Msg, MessageService };