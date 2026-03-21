import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './User.entity';
import { Chunk } from './Chunk.entity';

export enum DocumentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  INDEXED = 'indexed',
  ERROR = 'error',
}

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 500 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 255 })
  originalName: string;

  @Column({ type: 'varchar', length: 20 })
  format: string;

  @Column({ type: 'bigint' })
  size: number;

  @Column({ type: 'varchar', length: 255 })
  mimeType: string;

  @Column({ type: 'varchar', length: 1000 })
  s3Key: string;

  @Column({ type: 'varchar', length: 500 })
  s3Bucket: string;

  @Column({
    type: 'enum',
    enum: DocumentStatus,
    default: DocumentStatus.PENDING,
  })
  @Index()
  status: DocumentStatus;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ type: 'int', default: 0 })
  chunkCount: number;

  @Column({ type: 'timestamptz', nullable: true })
  processedAt: Date | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  tags: string[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.documents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'uploaded_by' })
  uploadedBy: User;

  @Column({ name: 'uploaded_by', type: 'uuid' })
  @Index()
  uploadedById: string;

  @OneToMany(() => Chunk, (chunk) => chunk.document, {
    cascade: true,
  })
  chunks: Chunk[];

  @Column({ type: 'varchar', length: 255, nullable: true })
  @Index()
  fingerprint: string | null;
}
