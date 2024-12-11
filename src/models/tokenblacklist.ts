import { Column, Entity, Index, PrimaryGeneratedColumn } from "typeorm";

// TODO: change to redis
@Entity()
export class TokenBlacklist {
    @PrimaryGeneratedColumn()
    id: number;
    
    @Column()
    @Index({ unique: true })
    jwtid: string;

    @Column({ type: 'datetime', default: () => 'CURRENT_TIMESTAMP' })
    expires_at: Date;
}