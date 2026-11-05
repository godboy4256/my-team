import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserEntity } from '../users/user.entity';
import { TeamPlayerEntity } from '../players/team-player.entity';

@Entity({ name: 'teams' })
export class TeamEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'owner_user_id', type: 'varchar', length: 36 })
  ownerUserId!: string;

  @ManyToOne(() => UserEntity, (user) => user.ownedTeams, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'owner_user_id' })
  owner!: UserEntity;

  @Column({ type: 'varchar', length: 100 })
  name!: string;

  @Column({ name: 'invite_code', type: 'varchar', length: 16, unique: true })
  inviteCode!: string;

  @Column({ name: 'home_town', type: 'varchar', length: 100, default: '' })
  homeTown!: string;

  @Column({ name: 'home_ground', type: 'varchar', length: 150, default: '' })
  homeGround!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ name: 'founded_at', type: 'varchar', length: 10, default: '' })
  foundedAt!: string;

  @Column({ name: 'activity_time', type: 'varchar', length: 100, default: '' })
  activityTime!: string;

  @Column({ name: 'kfa_registered', type: 'boolean', default: false })
  kfaRegistered!: boolean;

  @Column({ type: 'text' })
  competitions!: string;

  @Column({ type: 'varchar', length: 16, default: '⚽' })
  emblem!: string;

  @Column({ name: 'logo_data_url', type: 'longtext', nullable: true })
  logoDataUrl!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt!: Date;

  @OneToMany(() => TeamPlayerEntity, (player) => player.team)
  players!: TeamPlayerEntity[];
}
