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

  @Column({ type: 'integer' })
  position: number;

  @Column({ type: 'integer' })
  startOffset: number;

  @Column({ type: 'integer' })
  endOffset: number;

  @Column({ type: 'vector', length: 1536 })
  @Index({ synchronize: false }) // pgvector index managed separately
  embedding: number[];

  @Column({ type: 'float', nullable: true })
  embeddingDistance: number | null;

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
