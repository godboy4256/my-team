import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EvaluationOptionEntity } from './evaluation-option.entity';
import { EvaluationQuestionEntity } from './evaluation-question.entity';
import { EvaluationQuestionsController } from './evaluation-questions.controller';
import { EvaluationQuestionsService } from './evaluation-questions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EvaluationQuestionEntity,
      EvaluationOptionEntity,
    ]),
  ],
  controllers: [EvaluationQuestionsController],
  providers: [EvaluationQuestionsService],
  exports: [EvaluationQuestionsService],
})
export class EvaluationQuestionsModule {}
