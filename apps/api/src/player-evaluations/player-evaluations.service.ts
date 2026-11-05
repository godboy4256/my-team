import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlayerEvaluationEntity } from './player-evaluation.entity';
import { TeamEntity } from '../teams/team.entity';
import { TeamPlayerEntity } from '../players/team-player.entity';

@Injectable()
export class PlayerEvaluationsService {
  constructor(
    @InjectRepository(PlayerEvaluationEntity)
    private readonly evaluations: Repository<PlayerEvaluationEntity>,
    @InjectRepository(TeamPlayerEntity)
    private readonly players: Repository<TeamPlayerEntity>,
    @InjectRepository(TeamEntity)
    private readonly teams: Repository<TeamEntity>,
  ) {}

  async findAll(ownerUserId: string) {
    const teams = await this.teams.findBy({ ownerUserId });
    const teamIds = teams.map(({ id }) => id);
    if (teamIds.length === 0) return [];
    const players = await this.players.find({
      where: teamIds.map((teamId) => ({ teamId })),
    });
    if (players.length === 0) return [];
    return this.evaluations.find({
      where: players.map(({ id }) => ({ playerId: id })),
      order: { updatedAt: 'DESC' },
    });
  }

  async findOne(ownerUserId: string, playerId: string) {
    await this.assertPlayerOwner(ownerUserId, playerId);
    const evaluation = await this.evaluations.findOneBy({ playerId });
    if (!evaluation)
      throw new NotFoundException('선수 평가를 찾을 수 없습니다.');
    return evaluation;
  }

  async upsert(
    ownerUserId: string,
    playerId: string,
    scores: Record<string, number>,
  ) {
    await this.assertPlayerOwner(ownerUserId, playerId);
    await this.evaluations.save({ playerId, scores });
    return this.findOne(ownerUserId, playerId);
  }

  async remove(ownerUserId: string, playerId: string) {
    await this.assertPlayerOwner(ownerUserId, playerId);
    await this.evaluations.delete({ playerId });
    return { success: true };
  }

  private async assertPlayerOwner(ownerUserId: string, playerId: string) {
    const player = await this.players.findOne({
      where: { id: playerId },
      relations: { team: true },
    });
    if (!player) throw new NotFoundException('선수를 찾을 수 없습니다.');
    if (player.team.ownerUserId !== ownerUserId) {
      throw new ForbiddenException('이 선수 평가를 관리할 권한이 없습니다.');
    }
  }
}
