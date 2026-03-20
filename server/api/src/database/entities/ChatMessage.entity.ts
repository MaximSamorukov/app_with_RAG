import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ChatSession } from './ChatSession.entity';

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
}

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: MessageRole,
  })
  role: MessageRole;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  sources: Record<string, unknown>[] | null;

  @Column({ type: 'integer', nullable: true })
  position: number;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => ChatSession, (chatSession) => chatSession.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'chat_session_id' })
  chatSession: ChatSession;

  @Column({ name: 'chat_session_id' })
  @Index()
  chatSessionId: string;
}
