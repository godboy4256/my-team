import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TeamEntity } from '../teams/team.entity';
import { UserEntity } from '../users/user.entity';
import { TeamPlayerPositionEntity } from './team-player-position.entity';

@Entity({ name: 'team_players' })
export class TeamPlayerEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'team_id', type: 'varchar', length: 36 })
  teamId!: string;

  @ManyToOne(() => TeamEntity, (team) => team.players, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'team_id' })
  team!: TeamEntity;

  @Column({ name: 'user_id', type: 'varchar', length: 36, nullable: true })
  userId!: string | null;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user!: UserEntity | null;

  @Column({ type: 'varchar', length: 80 })
  name!: string;

  @Column({
    name: 'jersey_number',
    type: 'tinyint',
    unsigned: true,
    nullable: true,
  })
  jerseyNumber!: number | null;

  @Column({ name: 'birth_year', type: 'smallint', unsigned: true })
  birthYear!: number;

  @Column({ type: 'varchar', length: 10, default: 'member' })
  type!: 'member' | 'guest';

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @OneToMany(() => TeamPlayerPositionEntity, (link) => link.player, {
    cascade: true,
  })
  positionLinks!: TeamPlayerPositionEntity[];
}
