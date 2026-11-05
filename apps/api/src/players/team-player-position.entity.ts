import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { PositionEntity } from '../positions/position.entity';
import { TeamPlayerEntity } from './team-player.entity';

@Entity({ name: 'team_player_positions' })
export class TeamPlayerPositionEntity {
  @PrimaryColumn({ name: 'team_player_id', type: 'varchar', length: 36 })
  teamPlayerId!: string;

  @ManyToOne(() => TeamPlayerEntity, (player) => player.positionLinks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'team_player_id' })
  player!: TeamPlayerEntity;

  @PrimaryColumn({ name: 'position_id', type: 'int', unsigned: true })
  positionId!: number;

  @ManyToOne(() => PositionEntity, (position) => position.playerLinks, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'position_id' })
  position!: PositionEntity;

  @PrimaryColumn({ name: 'sort_order', type: 'smallint', unsigned: true })
  sortOrder!: number;
}
