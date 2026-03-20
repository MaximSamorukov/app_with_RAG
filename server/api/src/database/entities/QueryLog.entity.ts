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
import { ChatSession } from './ChatSession.entity';

export enum QueryStatus {
  SUCCESS = 'success',
  ERROR = 'error',
}

@Entity('query_logs')
export class QueryLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  query: string;

  @Column({ type: 'text', nullable: true })
  response: string | null;

  @Column({ type: 'integer', nullable: true })
  latencyMs: number | null;

  @Column({
    type: 'enum',
    enum: QueryStatus,
    default: QueryStatus.SUCCESS,
  })
  status: QueryStatus;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ name: 'user_id', nullable: true })
  @Index()
  userId: string | null;

  @ManyToOne(() => ChatSession, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'chat_session_id' })
  chatSession: ChatSession | null;

  @Column({ name: 'chat_session_id', nullable: true })
  chatSessionId: string | null;
}
