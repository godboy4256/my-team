import type { MigrationInterface, QueryRunner } from 'typeorm';

type SeedQuestion = {
  id: string;
  label: string;
  prompt: string;
  options: [string, string, string, string, string];
};

const questions: SeedQuestion[] = [
  {
    id: 'finishing',
    label: '골 결정력',
    prompt: '득점 기회를 얼마나 자주 골로 연결하나요?',
    options: [
      '슈팅 기회를 득점으로 연결하는 데 어려움이 크다.',
      '득점 기회를 놓치는 경우가 잦다.',
      '보통 수준이다. 넣는 기회와 놓치는 기회가 비슷하다.',
      '기회를 자주 득점으로 연결하며 마무리가 안정적이다.',
      '좋은 기회는 대부분 득점으로 연결한다.',
    ],
  },
  {
    id: 'offBall',
    label: '오프더볼 움직임',
    prompt: '공이 없을 때 공간을 찾아 움직이며 기회를 만드나요?',
    options: [
      '공이 없을 때 움직임이 적어 공격 관여가 드물다.',
      '공 주변에 머물러 공격 선택지가 제한될 때가 많다.',
      '기본적인 위치 이동을 하지만 움직임이 두드러지지 않는다.',
      '주변을 살피며 적절한 공간으로 꾸준히 움직인다.',
      '빈 공간과 수비 뒷공간을 찾아 결정적인 기회를 자주 만든다.',
    ],
  },
  {
    id: 'dribbling',
    label: '드리블·볼 운반',
    prompt: '공을 가지고 압박을 벗어나 전진할 수 있나요?',
    options: [
      '공을 가지고 전진하기 어렵고 소유권을 자주 잃는다.',
      '압박을 받으면 공을 빼앗기거나 전진에 실패하는 편이다.',
      '무리하지 않고 공을 지키거나 빈 공간으로 운반한다.',
      '1대1에서 자주 우위를 만들고 전진에 성공한다.',
      '여러 상대의 압박도 벗겨내며 안정적으로 전진한다.',
    ],
  },
  {
    id: 'shooting',
    label: '슈팅',
    prompt: '골문을 향해 위협적인 슈팅을 얼마나 잘 만드나요?',
    options: [
      '슈팅 기회를 만들거나 유효 슈팅을 하는 데 어려움이 크다.',
      '정확도나 타이밍이 아쉬운 경우가 많다.',
      '기회가 오면 무난하게 슈팅을 시도한다.',
      '좋은 위치에서 유효하고 정확한 슈팅을 꾸준히 한다.',
      '여러 상황에서 정확하고 위협적인 슈팅을 자주 만든다.',
    ],
  },
  {
    id: 'passing',
    label: '패스 정확도',
    prompt: '동료가 받기 좋은 패스를 얼마나 안정적으로 연결하나요?',
    options: [
      '기본적인 패스 연결에서도 실수가 자주 발생한다.',
      '패스가 빗나가거나 받기 어려운 경우가 잦다.',
      '쉬운 패스는 안정적이나 압박 상황에서 실수가 있다.',
      '대부분 의도한 동료에게 안정적으로 전달한다.',
      '짧고 긴 패스를 상황에 맞게 정확히 연결한다.',
    ],
  },
  {
    id: 'progression',
    label: '전진 패스',
    prompt: '패스로 팀의 공격을 얼마나 효과적으로 전진시키나요?',
    options: [
      '공을 전방으로 연결하는 데 어려움이 크다.',
      '전진 패스를 주저하거나 성공률이 낮은 편이다.',
      '안전한 연결을 우선하며 기회가 있을 때 전진 패스를 한다.',
      '전방 동료를 잘 찾아 공격을 빠르게 전개한다.',
      '수비 라인을 깨는 패스로 결정적인 기회를 자주 만든다.',
    ],
  },
  {
    id: 'vision',
    label: '시야·판단',
    prompt: '상황을 파악하고 적절한 선택을 얼마나 빠르게 하나요?',
    options: [
      '상황 파악이 늦어 공을 오래 끌거나 위험한 선택을 자주 한다.',
      '주변 확인이 늦거나 단순한 선택으로 기회를 놓친다.',
      '익숙한 상황에서는 무난하게 판단한다.',
      '압박과 동료 위치를 살피며 대체로 좋은 결정을 한다.',
      '주변을 미리 파악하고 팀에 유리한 선택을 빠르게 한다.',
    ],
  },
  {
    id: 'retention',
    label: '볼 키핑',
    prompt: '상대 압박 속에서 공을 지키고 소유권을 유지하나요?',
    options: [
      '압박 상황에서 공을 거의 지키지 못한다.',
      '압박을 받으면 공을 빼앗기는 경우가 많다.',
      '압박 강도에 따라 공을 지키거나 놓치는 편이다.',
      '압박을 받아도 침착하게 공을 보호해 동료에게 연결한다.',
      '강한 압박에서도 공을 지키며 팀이 정비할 시간을 만든다.',
    ],
  },
  {
    id: 'marking',
    label: '대인 수비',
    prompt: '상대를 따라가며 공격을 얼마나 효과적으로 제한하나요?',
    options: [
      '위치 잡기에 어려움이 있고 쉽게 돌파당한다.',
      '상대를 놓치거나 돌파를 허용하는 경우가 잦다.',
      '기본적인 대인 수비를 수행하며 큰 실수가 많지 않다.',
      '거리를 잘 유지하며 돌파와 선택지를 효과적으로 제한한다.',
      '강한 상대도 안정적으로 막고 쉽게 돌파를 허용하지 않는다.',
    ],
  },
  {
    id: 'tackling',
    label: '태클·볼 탈취',
    prompt: '적절한 순간에 상대의 공을 빼앗거나 공격을 끊나요?',
    options: [
      '공을 따내기 어렵고 무리한 도전으로 위험을 만든다.',
      '타이밍이 늦거나 성급한 도전으로 기회를 내준다.',
      '수비 경합에 참여하며 성공과 실패가 비슷하다.',
      '적절한 순간에 개입해 공을 따내는 경우가 많다.',
      '타이밍을 정확히 잡아 공을 따내고 공격으로 연결한다.',
    ],
  },
  {
    id: 'positioning',
    label: '수비 위치 선정',
    prompt: '위험 지역과 동료 위치를 고려해 자리를 잡나요?',
    options: [
      '위치 잡기에 어려움이 커 위험 지역을 자주 비운다.',
      '위치를 자주 벗어나거나 동료와 간격이 벌어진다.',
      '기본 위치를 지키지만 상황에 따라 반응이 늦다.',
      '수비 간격과 상대 움직임을 살피며 안정적으로 위치를 지킨다.',
      '위험을 미리 읽고 자리를 선점해 공격을 자주 차단한다.',
    ],
  },
  {
    id: 'interception',
    label: '패스 차단',
    prompt: '상대 패스 경로를 읽고 연결을 끊나요?',
    options: [
      '상대 패스 흐름을 읽고 차단하는 데 어려움이 크다.',
      '패스 경로를 놓쳐 상대가 쉽게 연결하는 경우가 많다.',
      '기본적인 패스 길목을 지키며 무난하게 대응한다.',
      '상대 선택을 예측해 패스를 차단하거나 어렵게 만든다.',
      '패스 방향을 미리 읽어 결정적인 연결을 자주 끊는다.',
    ],
  },
  {
    id: 'speed',
    label: '속도',
    prompt: '속도 경합에서 이 선수는 어떤 편인가요?',
    options: [
      '속도 경합에서 거의 우위를 보이지 못한다.',
      '느린 편이라 속도 경합에서 밀리는 경우가 많다.',
      '보통 수준으로 경합에서 이기거나 밀리는 경우가 비슷하다.',
      '팀에서 빠른 편이며 경합에서도 자주 우위를 보인다.',
      '대부분의 속도 경합에서 상대보다 먼저 도달한다.',
    ],
  },
  {
    id: 'stamina',
    label: '체력·활동량',
    prompt: '경기 내내 필요한 움직임과 수비 가담을 유지하나요?',
    options: [
      '경기 내내 움직임을 유지하기 어려워 관여가 제한된다.',
      '중반 이후 활동량이나 복귀가 눈에 띄게 줄어든다.',
      '보통 수준이며 후반에는 움직임이 줄어들 수 있다.',
      '경기 대부분 활발히 움직이고 수비 복귀도 잘한다.',
      '경기 내내 높은 활동량으로 공격과 수비에 꾸준히 참여한다.',
    ],
  },
  {
    id: 'strength',
    label: '몸싸움·밸런스',
    prompt: '경합에서 균형을 유지하며 버티나요?',
    options: [
      '몸싸움에서 버티기 어려워 경합을 피하는 편이다.',
      '접촉이 있으면 균형을 잃거나 공을 놓치는 경우가 많다.',
      '상대와 상황에 따라 경합 결과가 달라진다.',
      '대부분의 경합에서 잘 버티며 쉽게 밀리지 않는다.',
      '강한 경합에서도 균형을 잃지 않고 공을 지키거나 따낸다.',
    ],
  },
];

export class CreateEvaluationQuestionCatalog1762492800000 implements MigrationInterface {
  name = 'CreateEvaluationQuestionCatalog1762492800000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "CREATE TABLE IF NOT EXISTS `evaluation_questions` (`id` varchar(50) NOT NULL, `label` varchar(120) NOT NULL, `prompt` varchar(255) NOT NULL DEFAULT '', `sort_order` smallint unsigned NOT NULL, `is_active` tinyint NOT NULL DEFAULT 1, PRIMARY KEY (`id`), UNIQUE INDEX `UQ_evaluation_questions_sort_order` (`sort_order`)) ENGINE=InnoDB",
    );
    await queryRunner.query(
      'CREATE TABLE IF NOT EXISTS `evaluation_options` (`question_id` varchar(50) NOT NULL, `score` tinyint unsigned NOT NULL, `description` varchar(500) NOT NULL, PRIMARY KEY (`question_id`, `score`), CONSTRAINT `FK_evaluation_options_question` FOREIGN KEY (`question_id`) REFERENCES `evaluation_questions` (`id`) ON DELETE CASCADE) ENGINE=InnoDB',
    );

    for (const [index, question] of questions.entries()) {
      await queryRunner.query(
        'INSERT IGNORE INTO `evaluation_questions` (`id`, `label`, `prompt`, `sort_order`, `is_active`) VALUES (?, ?, ?, ?, 1)',
        [question.id, question.label, question.prompt, index + 1],
      );
      for (const [optionIndex, description] of question.options.entries()) {
        await queryRunner.query(
          'INSERT IGNORE INTO `evaluation_options` (`question_id`, `score`, `description`) VALUES (?, ?, ?)',
          [question.id, optionIndex + 1, description],
        );
      }
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `evaluation_options`');
    await queryRunner.query('DROP TABLE IF EXISTS `evaluation_questions`');
  }
}
