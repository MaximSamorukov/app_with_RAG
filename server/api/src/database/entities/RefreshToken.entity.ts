import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './User.entity';

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'token_hash', type: 'varchar', length: 500 })
  tokenHash: string;

  @Index()
  @Column({ type: 'timestamptz' })
  expiresAt: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  revokedAt: Date | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  revokedReason: string | null;

  @Column({ type: 'varchar', length: 45 })
  @Index()
  fingerprint: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.refreshTokens, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;
}
