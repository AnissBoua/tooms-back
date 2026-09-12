import { Entity, PrimaryGeneratedColumn, ManyToOne, Column, Unique } from 'typeorm';
import { User } from './user';
import { Conversation } from './conversation';

@Entity()
@Unique(['user', 'conversation'])
export class ReadReceipt {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User)
    user: User;

    @ManyToOne(() => Conversation)
    conversation: Conversation;

    @Column({ type: 'datetime' })
    last_read_at: Date;
}
