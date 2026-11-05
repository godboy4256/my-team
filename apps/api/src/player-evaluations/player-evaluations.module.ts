import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlayerEvaluationEntity } from './player-evaluation.entity';
import { PlayerEvaluationsController } from './player-evaluations.controller';
import { PlayerEvaluationsService } from './player-evaluations.service';
import { TeamEntity } from '../teams/team.entity';
import { TeamPlayerEntity } from '../players/team-player.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PlayerEvaluationEntity,
      TeamPlayerEntity,
      TeamEntity,
    ]),
    AuthModule,
  ],
  controllers: [PlayerEvaluationsController],
  providers: [PlayerEvaluationsService],
})
export class PlayerEvaluationsModule {}
