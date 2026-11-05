import { Controller, Get } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PositionEntity } from './position.entity';

@Controller('positions')
export class PositionsController {
  constructor(
    @InjectRepository(PositionEntity)
    private readonly positions: Repository<PositionEntity>,
  ) {}

  @Get()
  findAll() {
    return this.positions.find({ order: { sortOrder: 'ASC' } });
  }
}
