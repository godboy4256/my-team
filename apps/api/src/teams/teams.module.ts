import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { PlayerEvaluationEntity } from '../player-evaluations/player-evaluation.entity';
import { PositionEntity } from '../positions/position.entity';
import { TeamPlayerPositionEntity } from '../players/team-player-position.entity';
import { TeamPlayerEntity } from '../players/team-player.entity';
import { TeamEntity } from './team.entity';
import { TeamsController } from './teams.controller';
import { TeamsService } from './teams.service';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      TeamEntity,
      TeamPlayerEntity,
      TeamPlayerPositionEntity,
      PositionEntity,
      PlayerEvaluationEntity,
    ]),
  ],
  controllers: [TeamsController],
  providers: [TeamsService],
  exports: [TeamsService],
})
export class TeamsModule {}
