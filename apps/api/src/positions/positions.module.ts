import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PositionEntity } from './position.entity';
import { PositionsController } from './positions.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PositionEntity])],
  controllers: [PositionsController],
})
export class PositionsModule {}
