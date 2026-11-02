export const positions = [
  'GK',
  '센터백',
  '사이드백',
  '수비형 미드필더',
  '미드필더',
  '공격형 미드필더',
  '윙어',
  '톱',
  '포지션 상관없음',
] as const;

export type Position = (typeof positions)[number];

export type Player = {
  id: string;
  name: string;
  age: number;
  preferredPositions: Position[];
  type: 'member' | 'guest';
};

export type Formation = {
  id: string;
  label: string;
  description: string;
  slots: Position[];
};

export type FormationMode = 'same' | 'different' | 'recommended';

export type LineupSlot = {
  position: Position;
  playerId: string | null;
};

export type QuarterLineup = {
  formationId: string;
  slots: LineupSlot[];
};

export const formations: Formation[] = [
  {
    id: '4-3-3',
    label: '4-3-3',
    description: '측면 공격과 전방 압박',
    slots: [
      'GK',
      '센터백',
      '센터백',
      '사이드백',
      '사이드백',
      '수비형 미드필더',
      '미드필더',
      '미드필더',
      '윙어',
      '윙어',
      '톱',
    ],
  },
  {
    id: '4-4-2',
    label: '4-4-2',
    description: '안정적인 두 줄 수비',
    slots: [
      'GK',
      '센터백',
      '센터백',
      '사이드백',
      '사이드백',
      '미드필더',
      '미드필더',
      '윙어',
      '윙어',
      '톱',
      '톱',
    ],
  },
  {
    id: '3-5-2',
    label: '3-5-2',
    description: '중앙 숫자 우위와 폭넓은 중원',
    slots: [
      'GK',
      '센터백',
      '센터백',
      '센터백',
      '수비형 미드필더',
      '미드필더',
      '미드필더',
      '윙어',
      '윙어',
      '톱',
      '톱',
    ],
  },
];

export const demoPlayers: Player[] = [
  {
    id: 'p-01',
    name: '김민준',
    age: 28,
    preferredPositions: ['GK'],
    type: 'member',
  },
  {
    id: 'p-02',
    name: '이도윤',
    age: 31,
    preferredPositions: ['센터백', '사이드백'],
    type: 'member',
  },
  {
    id: 'p-03',
    name: '박서준',
    age: 35,
    preferredPositions: ['센터백', '수비형 미드필더'],
    type: 'member',
  },
  {
    id: 'p-04',
    name: '최현우',
    age: 29,
    preferredPositions: ['사이드백', '윙어'],
    type: 'member',
  },
  {
    id: 'p-05',
    name: '정우진',
    age: 38,
    preferredPositions: ['센터백', '사이드백'],
    type: 'member',
  },
  {
    id: 'p-06',
    name: '한지훈',
    age: 32,
    preferredPositions: ['수비형 미드필더', '미드필더'],
    type: 'member',
  },
  {
    id: 'p-07',
    name: '오준호',
    age: 27,
    preferredPositions: ['미드필더', '공격형 미드필더'],
    type: 'member',
  },
  {
    id: 'p-08',
    name: '윤태양',
    age: 34,
    preferredPositions: ['미드필더', '윙어'],
    type: 'member',
  },
  {
    id: 'p-09',
    name: '임성민',
    age: 30,
    preferredPositions: ['윙어', '톱'],
    type: 'member',
  },
  {
    id: 'p-10',
    name: '장민재',
    age: 26,
    preferredPositions: ['윙어', '공격형 미드필더'],
    type: 'member',
  },
  {
    id: 'p-11',
    name: '조현석',
    age: 36,
    preferredPositions: ['톱', '윙어'],
    type: 'member',
  },
  {
    id: 'p-12',
    name: '신재원',
    age: 25,
    preferredPositions: ['공격형 미드필더', '미드필더'],
    type: 'member',
  },
  {
    id: 'p-13',
    name: '강민호',
    age: 41,
    preferredPositions: ['센터백', '수비형 미드필더'],
    type: 'member',
  },
  {
    id: 'p-14',
    name: '배준영',
    age: 33,
    preferredPositions: ['톱', '윙어'],
    type: 'member',
  },
  {
    id: 'p-15',
    name: '유승우',
    age: 29,
    preferredPositions: ['포지션 상관없음'],
    type: 'member',
  },
  {
    id: 'p-16',
    name: '문지환',
    age: 37,
    preferredPositions: ['미드필더', '사이드백'],
    type: 'member',
  },
  {
    id: 'p-17',
    name: '서준혁',
    age: 30,
    preferredPositions: ['포지션 상관없음'],
    type: 'guest',
  },
  {
    id: 'p-18',
    name: '권도현',
    age: 32,
    preferredPositions: ['센터백', '미드필더'],
    type: 'guest',
  },
];

function positionScore(player: Player, position: Position): number {
  if (player.preferredPositions.includes('포지션 상관없음')) {
    return 1;
  }

  const preferenceIndex = player.preferredPositions.indexOf(position);

  if (preferenceIndex >= 0) {
    return 100 - preferenceIndex * 20;
  }

  const relatedPositions: Partial<Record<Position, Position[]>> = {
    센터백: ['사이드백', '수비형 미드필더'],
    사이드백: ['센터백', '윙어'],
    '수비형 미드필더': ['미드필더', '센터백'],
    미드필더: ['수비형 미드필더', '공격형 미드필더'],
    '공격형 미드필더': ['미드필더', '윙어'],
    윙어: ['톱', '사이드백', '공격형 미드필더'],
    톱: ['윙어', '공격형 미드필더'],
  };

  if (
    relatedPositions[position]?.some((related) =>
      player.preferredPositions.includes(related),
    )
  ) {
    return 30;
  }

  return 0;
}

function chooseFormation(
  mode: FormationMode,
  selectedFormationId: string,
  quarterIndex: number,
  players: Player[],
): Formation {
  if (mode === 'same') {
    return (
      formations.find(({ id }) => id === selectedFormationId) ?? formations[0]!
    );
  }

  if (mode === 'different') {
    return formations[quarterIndex % formations.length]!;
  }

  return [...formations].sort(
    (first, second) =>
      getFormationFitScore(second, players) -
      getFormationFitScore(first, players),
  )[0]!;
}

function getFormationFitScore(formation: Formation, players: Player[]): number {
  const remainingPlayers = [...players];

  return formation.slots.reduce((total, position) => {
    remainingPlayers.sort(
      (first, second) =>
        positionScore(second, position) - positionScore(first, position),
    );

    const bestFit = remainingPlayers.shift();

    return total + (bestFit ? positionScore(bestFit, position) : 0);
  }, 0);
}

export function createLineups({
  players,
  quarterCount,
  mode,
  formationId,
  minimumQuarters,
}: {
  players: Player[];
  quarterCount: number;
  mode: FormationMode;
  formationId: string;
  minimumQuarters: number;
}): QuarterLineup[] {
  const playCounts = new Map(players.map(({ id }) => [id, 0]));

  return Array.from({ length: quarterCount }, (_, quarterIndex) => {
    const formation = chooseFormation(mode, formationId, quarterIndex, players);
    const availablePlayers = [...players];
    const slots = formation.slots.map((position) => {
      availablePlayers.sort((first, second) => {
        const firstCount = playCounts.get(first.id) ?? 0;
        const secondCount = playCounts.get(second.id) ?? 0;
        const firstNeedsMinimum = firstCount < minimumQuarters;
        const secondNeedsMinimum = secondCount < minimumQuarters;

        if (firstNeedsMinimum !== secondNeedsMinimum) {
          return firstNeedsMinimum ? -1 : 1;
        }

        if (firstCount !== secondCount) {
          return firstCount - secondCount;
        }

        return positionScore(second, position) - positionScore(first, position);
      });

      const player = availablePlayers.shift();

      if (player) {
        const count = playCounts.get(player.id) ?? 0;
        playCounts.set(player.id, count + 1);
      }

      return { position, playerId: player?.id ?? null };
    });

    return { formationId: formation.id, slots };
  });
}
