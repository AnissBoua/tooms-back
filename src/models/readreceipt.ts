import { Entity, PrimaryGeneratedColumn, ManyToOne, Column, Unique } from 'typeorm';
import { User } from './user';
import { Conversation } from './conversation';

@Entity()
@Unique(['user', 'conversation'])
export class ReadReceipt {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    user: User;

    @ManyToOne(() => Conversation, { onDelete: 'CASCADE' })
    conversation: Conversation;

    @Column({ type: 'datetime' })
    last_read_at: Date;
}
