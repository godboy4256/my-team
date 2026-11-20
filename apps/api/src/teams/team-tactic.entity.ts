import {
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ name: 'team_tactics' })
@Index('IDX_team_tactics_team_shared', ['teamId', 'isShared'])
export class TeamTacticEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'team_id', type: 'varchar', length: 36 })
  teamId!: string;

  @Column({ type: 'varchar', length: 120 })
  name!: string;

  @Column({ type: 'json' })
  data!: Record<string, unknown>;

  @Column({ name: 'is_shared', type: 'boolean', default: false })
  isShared!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt!: Date;
}
