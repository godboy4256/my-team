export type EvaluationOption = {
  score: number;
  description: string;
};

export type EvaluationQuestion = {
  id: string;
  label: string;
  prompt: string;
  sortOrder: number;
  options: EvaluationOption[];
};

export type PlayerEvaluation = {
  playerId: string;
  scores: Partial<Record<string, number>>;
  updatedAt: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function parseEvaluationQuestions(value: unknown): EvaluationQuestion[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): EvaluationQuestion[] => {
    if (
      !isRecord(item) ||
      typeof item['id'] !== 'string' ||
      typeof item['label'] !== 'string' ||
      typeof item['prompt'] !== 'string' ||
      typeof item['sortOrder'] !== 'number' ||
      !Array.isArray(item['options'])
    ) {
      return [];
    }

    const optionItems: unknown[] = item['options'];
    const options = optionItems.flatMap((option): EvaluationOption[] => {
      if (
        !isRecord(option) ||
        typeof option['score'] !== 'number' ||
        !Number.isInteger(option['score']) ||
        option['score'] < 1 ||
        option['score'] > 5 ||
        typeof option['description'] !== 'string'
      ) {
        return [];
      }
      return [
        {
          score: option['score'],
          description: option['description'],
        },
      ];
    });
    if (options.length !== 5) return [];
    options.sort((a, b) => a.score - b.score);
    if (options.some((option, index) => option.score !== index + 1)) return [];

    return [
      {
        id: item['id'],
        label: item['label'],
        prompt: item['prompt'],
        sortOrder: item['sortOrder'],
        options,
      },
    ];
  });
}

export async function fetchEvaluationQuestions(): Promise<
  EvaluationQuestion[]
> {
  const response = await fetch('/api/evaluation-questions');
  if (!response.ok) {
    throw new Error('평가 항목을 불러오지 못했습니다.');
  }

  const questions = parseEvaluationQuestions(await response.json());
  if (questions.length === 0) {
    throw new Error('등록된 평가 항목이 없습니다.');
  }
  return questions;
}
