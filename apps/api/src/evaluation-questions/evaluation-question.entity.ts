import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { EvaluationOptionEntity } from './evaluation-option.entity';

@Entity({ name: 'evaluation_questions' })
export class EvaluationQuestionEntity {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id!: string;

  @Column({ type: 'varchar', length: 120 })
  label!: string;

  @Column({ type: 'varchar', length: 255, default: '' })
  prompt!: string;

  @Column({ name: 'sort_order', type: 'smallint', unsigned: true })
  sortOrder!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @OneToMany(() => EvaluationOptionEntity, (option) => option.question)
  options!: EvaluationOptionEntity[];
}
