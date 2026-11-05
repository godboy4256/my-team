import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { TeamPlayerPositionEntity } from '../players/team-player-position.entity';

@Entity({ name: 'positions' })
export class PositionEntity {
  @PrimaryGeneratedColumn({ type: 'int', unsigned: true })
  id!: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  code!: string;

  @Column({ type: 'varchar', length: 80 })
  label!: string;

  @Column({ type: 'varchar', length: 20 })
  category!: string;

  @Column({ name: 'sort_order', type: 'smallint', unsigned: true })
  sortOrder!: number;

  @OneToMany(() => TeamPlayerPositionEntity, (link) => link.position)
  playerLinks!: TeamPlayerPositionEntity[];
}
