import { Entity, PrimaryGeneratedColumn, ManyToOne, Column } from 'typeorm';
import { User } from './user';
import { Conversation } from './conversation';

@Entity()
export class Call {
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Conversation, { onDelete: 'CASCADE' })
    conversation: Conversation;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    initiator: User;

    @Column({ type: 'enum', enum: ['audio', 'video'] })
    type: 'audio' | 'video';

    // Whether the call ever actually connected - lets the UI distinguish
    // a completed call from one that was refused or never answered.
    @Column({ type: 'boolean', default: false })
    connected: boolean;

    @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    started_at: Date;

    @Column({ type: 'datetime', nullable: true })
    ended_at: Date | null;
}
