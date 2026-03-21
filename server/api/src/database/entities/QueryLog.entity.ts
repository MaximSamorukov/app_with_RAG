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

  @Column({ name: 'question', type: 'text' })
  question: string;

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

  @Column({ name: 'chunk_ids', type: 'uuid', array: true, nullable: true })
  chunkIds: string[] | null;

  @Column({ name: 'similarity_scores', type: 'float', array: true, nullable: true })
  similarityScores: number[] | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  provider: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  model: string | null;

  @Column({ name: 'has_context', type: 'boolean', nullable: true })
  hasContext: boolean | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  @Index()
  userId: string | null;

  @ManyToOne(() => ChatSession, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'session_id' })
  session: ChatSession | null;

  @Column({ name: 'session_id', type: 'uuid', nullable: true })
  sessionId: string | null;
}
