import { Entity, PrimaryGeneratedColumn, ManyToMany, OneToMany, JoinTable } from 'typeorm';
import { User } from './user';
import { Message } from './message';

@Entity()
export class Conversation {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToMany(() => User, user => user.conversations)
    @JoinTable()
    participants: User[];

    @OneToMany(() => Message, message => message.conversation)
    messages: Message[];
}
