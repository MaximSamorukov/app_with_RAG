import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Instruction } from './Instruction.entity';

@Entity('instruction_versions')
export class InstructionVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'version_number', type: 'integer' })
  versionNumber: number;

  @Column({ name: 'content', type: 'text' })
  content: string;

  @Column({ type: 'text', nullable: true })
  changes: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  changedBy: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @ManyToOne(() => Instruction, (instruction) => instruction.versions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'instruction_id' })
  instruction: Instruction;

  @Column({ name: 'instruction_id' })
  instructionId: string;
}
