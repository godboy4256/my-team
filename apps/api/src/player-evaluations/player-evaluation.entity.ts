import { Column, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'player_evaluations' })
export class PlayerEvaluationEntity {
  @PrimaryColumn({ name: 'player_id', type: 'varchar', length: 36 })
  playerId!: string;

  @Column({ type: 'json' })
  scores!: Record<string, number>;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
