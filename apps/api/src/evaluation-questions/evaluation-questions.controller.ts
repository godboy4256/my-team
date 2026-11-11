import { Controller, Get } from '@nestjs/common';
import { EvaluationQuestionsService } from './evaluation-questions.service';

@Controller('evaluation-questions')
export class EvaluationQuestionsController {
  constructor(private readonly questions: EvaluationQuestionsService) {}

  @Get()
  findAll() {
    return this.questions.findAll();
  }
}
