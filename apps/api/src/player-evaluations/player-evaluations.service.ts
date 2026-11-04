import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlayerEvaluationEntity } from './player-evaluation.entity';

@Injectable()
export class PlayerEvaluationsService {
  constructor(
    @InjectRepository(PlayerEvaluationEntity)
    private readonly evaluations: Repository<PlayerEvaluationEntity>,
  ) {}

  findAll() {
    return this.evaluations.find({ order: { updatedAt: 'DESC' } });
  }

  async findOne(playerId: string) {
    const evaluation = await this.evaluations.findOneBy({ playerId });
    if (!evaluation)
      throw new NotFoundException('선수 평가를 찾을 수 없습니다.');
    return evaluation;
  }

  async upsert(playerId: string, scores: Record<string, number>) {
    await this.evaluations.save({ playerId, scores });
    return this.findOne(playerId);
  }

  async remove(playerId: string) {
    await this.evaluations.delete({ playerId });
  }
}
