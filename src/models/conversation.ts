import { Entity, PrimaryGeneratedColumn, ManyToMany, OneToMany, JoinTable, Column } from 'typeorm';
import { User } from './user';
import { Message } from './message';

@Entity()
export class Conversation {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({ nullable: true })
    name: string;

    @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    created_at: Date;

    @ManyToMany(() => User, user => user.conversations)
    @JoinTable()
    participants: User[];

    @OneToMany(() => Message, message => message.conversation)
    messages: Message[];
}
