import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EvaluationQuestionEntity } from './evaluation-question.entity';

@Injectable()
export class EvaluationQuestionsService {
  constructor(
    @InjectRepository(EvaluationQuestionEntity)
    private readonly questions: Repository<EvaluationQuestionEntity>,
  ) {}

  findAll() {
    return this.questions.find({
      where: { isActive: true },
      relations: { options: true },
      order: { sortOrder: 'ASC', options: { score: 'ASC' } },
    });
  }

  async assertScoresMatchActiveQuestions(scores: Record<string, number>) {
    const questions = await this.questions.find({
      where: { isActive: true },
      select: { id: true },
    });
    const activeIds = new Set(questions.map(({ id }) => id));
    const scoreIds = Object.keys(scores);
    if (
      scoreIds.length !== activeIds.size ||
      scoreIds.some((id) => !activeIds.has(id))
    ) {
      throw new BadRequestException(
        '평가 문항 구성이 변경되었습니다. 문진표를 새로고침해 주세요.',
      );
    }
  }
}
