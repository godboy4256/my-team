import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { EvaluationQuestionEntity } from './evaluation-question.entity';

@Entity({ name: 'evaluation_options' })
export class EvaluationOptionEntity {
  @PrimaryColumn({ name: 'question_id', type: 'varchar', length: 50 })
  questionId!: string;

  @PrimaryColumn({ type: 'tinyint', unsigned: true })
  score!: number;

  @ManyToOne(() => EvaluationQuestionEntity, (question) => question.options, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'question_id' })
  question!: EvaluationQuestionEntity;

  @Column({ type: 'varchar', length: 500 })
  description!: string;
}
