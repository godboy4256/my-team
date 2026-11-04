import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlayerEvaluationEntity } from './player-evaluation.entity';
import { PlayerEvaluationsController } from './player-evaluations.controller';
import { PlayerEvaluationsService } from './player-evaluations.service';

@Module({
  imports: [TypeOrmModule.forFeature([PlayerEvaluationEntity])],
  controllers: [PlayerEvaluationsController],
  providers: [PlayerEvaluationsService],
})
export class PlayerEvaluationsModule {}
