import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Document } from './Document.entity';

@Entity('chunks')
export class Chunk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'chunk_index', type: 'integer' })
  chunkIndex: number;

  @Column({ type: 'integer' })
  startOffset: number;

  @Column({ type: 'integer' })
  endOffset: number;

  @Column({ type: 'vector', length: 1536 })
  @Index()
  embedding: number[];

  @Column({ type: 'float', nullable: true })
  embeddingDistance: number | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ name: 'deactivated_by', type: 'uuid', nullable: true })
  deactivatedBy: string | null;

  @Column({ name: 'deactivated_at', type: 'timestamptz', nullable: true })
  deactivatedAt: Date | null;

  @Column({ name: 'token_count', type: 'integer', nullable: true })
  tokenCount: number | null;

  @Column({ name: 'page_number', type: 'integer', nullable: true })
  pageNumber: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Document, (document) => document.chunks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'document_id' })
  document: Document;

  @Column({ name: 'document_id' })
  @Index()
  documentId: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  metadata: string | null;
}
