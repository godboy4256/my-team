import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
} from '@nestjs/common';
import { PlayerEvaluationsService } from './player-evaluations.service';

function parseScores(value: unknown): Record<string, number> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new BadRequestException('scores는 점수 객체여야 합니다.');
  }
  const entries = Object.entries(value);
  if (
    entries.length === 0 ||
    entries.some(
      ([key, score]) =>
        !/^[a-zA-Z][a-zA-Z0-9]*$/.test(key) ||
        !Number.isInteger(score) ||
        Number(score) < 1 ||
        Number(score) > 5,
    )
  ) {
    throw new BadRequestException('각 점수는 1~5 사이 정수여야 합니다.');
  }
  return Object.fromEntries(entries) as Record<string, number>;
}

@Controller('player-evaluations')
export class PlayerEvaluationsController {
  constructor(private readonly service: PlayerEvaluationsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':playerId')
  findOne(@Param('playerId') playerId: string) {
    return this.service.findOne(playerId);
  }

  @Put(':playerId')
  upsert(@Param('playerId') playerId: string, @Body() body: unknown) {
    if (typeof body !== 'object' || body === null || !('scores' in body)) {
      throw new BadRequestException('scores 항목이 필요합니다.');
    }
    return this.service.upsert(playerId, parseScores(body.scores));
  }

  @Delete(':playerId')
  remove(@Param('playerId') playerId: string) {
    return this.service.remove(playerId);
  }
}
