export const positions = [
  '골키퍼',
  '왼쪽 센터백',
  '오른쪽 센터백',
  '오른쪽 윙',
  '왼쪽 윙',
  '오른쪽 수비형 미드필더',
  '왼쪽 수비형 미드필더',
  '중앙 수비형 미드필더',
  '중앙 미드필더',
  '왼쪽 미드필더',
  '오른쪽 미드필더',
  '오른쪽 공격형 미드필더',
  '왼쪽 공격형 미드필더',
  '중앙 공격형 미드필더',
  '오른쪽 사이드백',
  '왼쪽 사이드백',
  '원톱',
  '왼쪽 투톱',
  '오른쪽 투톱',
  '포지션 상관없음',
] as const;

type FormationPosition =
  | 'GK'
  | '센터백'
  | '사이드백'
  | '수비형 미드필더'
  | '미드필더'
  | '공격형 미드필더'
  | '윙어'
  | '톱';
export type Position = (typeof positions)[number] | FormationPosition;

export type Player = {
  id: string;
  name: string;
  birthYear: number;
  preferredPositions: Position[];
  type: 'member' | 'guest';
};

export type Formation = {
  id: string;
  label: string;
  description: string;
  slots: Position[];
  layout?: FormationLayout[];
};

type FormationLayout = {
  lane: number;
  spreadStart: number;
  spreadEnd: number;
};

function createFormationLayout(
  ...rows: {
    count: number;
    lane: number;
    spreadStart: number;
    spreadEnd: number;
  }[]
): FormationLayout[] {
  return rows.flatMap(({ count, lane, spreadStart, spreadEnd }) =>
    Array.from({ length: count }, () => ({ lane, spreadStart, spreadEnd })),
  );
}

export type FormationMode = 'same' | 'different' | 'recommended';

export type LineupSlot = {
  position: Position;
  playerId: string | null;
  x: number;
  y: number;
};

export type QuarterLineup = {
  formationId: string;
  slots: LineupSlot[];
};

export function detectFormationLabel(
  lineup: QuarterLineup | undefined,
  isVerticalPitch: boolean,
  fallbackLabel: string,
): string {
  if (!lineup) return fallbackLabel;

  const axis = isVerticalPitch ? 'y' : 'x';
  const rows = [0, 0, 0, 0];
  for (const slot of lineup.slots) {
    if (slot.playerId === null || slot.position === 'GK') continue;

    const coordinate = slot[axis];
    const area =
      coordinate < 22 ? 0 : coordinate < 45 ? 1 : coordinate < 63 ? 2 : 3;
    rows[area] += 1;
  }

  const occupiedRows = rows.filter((count) => count > 0).reverse();
  return occupiedRows.length < 2 ? fallbackLabel : occupiedRows.join('-');
}

export function getFormationPlayerCoordinates(
  formation: Formation,
  position: Position,
  slotIndex: number,
  isVerticalPitch: boolean,
): { x: number; y: number } {
  const explicitLayout = formation.layout?.[slotIndex];

  if (explicitLayout) {
    const rowSlots = formation.layout!.reduce<number[]>(
      (indices, layout, index) =>
        layout.lane === explicitLayout.lane &&
        layout.spreadStart === explicitLayout.spreadStart &&
        layout.spreadEnd === explicitLayout.spreadEnd
          ? [...indices, index]
          : indices,
      [],
    );
    const rowIndex = rowSlots.indexOf(slotIndex);
    const spread =
      rowSlots.length === 1
        ? 50
        : explicitLayout.spreadStart +
          ((explicitLayout.spreadEnd - explicitLayout.spreadStart) * rowIndex) /
            (rowSlots.length - 1);

    return isVerticalPitch
      ? { x: spread, y: explicitLayout.lane }
      : { x: explicitLayout.lane, y: spread };
  }

  const is442Midfielder =
    formation.id === '4-4-2' && ['미드필더', '윙어'].includes(position);
  const groups = [
    ['톱'],
    ['윙어', '공격형 미드필더'],
    ['수비형 미드필더', '미드필더'],
    ['센터백', '사이드백'],
    ['골키퍼'],
  ];
  const groupIndex = is442Midfielder
    ? 1
    : groups.findIndex((group) => group.includes(position));
  const rowSlots = formation.slots
    .map((slotPosition, index) => ({ slotPosition, index }))
    .filter(({ slotPosition }) =>
      is442Midfielder
        ? ['미드필더', '윙어'].includes(slotPosition)
        : groups[groupIndex]?.includes(slotPosition),
    );
  const rowIndex = rowSlots.findIndex(({ index }) => index === slotIndex);
  const count = Math.max(1, rowSlots.length);
  const lane = is442Midfielder ? 48 : 10 + groupIndex * 20;
  const isCentralMidfield = groupIndex === 2;
  const is442Striker = groupIndex === 0 && formation.id === '4-4-2';
  const is352Striker = groupIndex === 0 && formation.id === '3-5-2';
  const spreadStart = is442Striker
    ? 37
    : is352Striker
      ? 32
      : groupIndex === 0
        ? 33
        : isCentralMidfield
          ? 34
          : 18;
  const spreadRange = is442Striker
    ? 26
    : is352Striker
      ? 36
      : groupIndex === 0
        ? 34
        : isCentralMidfield
          ? 32
          : 64;
  const spread =
    count === 1 ? 50 : spreadStart + (spreadRange * rowIndex) / (count - 1);

  return isVerticalPitch ? { x: spread, y: lane } : { x: lane, y: spread };
}

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
    layout: createFormationLayout(
      { count: 1, lane: 90, spreadStart: 50, spreadEnd: 50 },
      { count: 4, lane: 70, spreadStart: 18, spreadEnd: 82 },
      { count: 3, lane: 50, spreadStart: 22, spreadEnd: 78 },
      { count: 2, lane: 30, spreadStart: 18, spreadEnd: 82 },
      { count: 1, lane: 10, spreadStart: 50, spreadEnd: 50 },
    ),
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
      '윙어',
      '윙어',
      '미드필더',
      '미드필더',
      '톱',
      '톱',
    ],
    layout: createFormationLayout(
      { count: 1, lane: 94, spreadStart: 50, spreadEnd: 50 },
      { count: 4, lane: 73, spreadStart: 18, spreadEnd: 82 },
      { count: 2, lane: 42, spreadStart: 18, spreadEnd: 82 },
      { count: 2, lane: 50, spreadStart: 34, spreadEnd: 66 },
      { count: 2, lane: 10, spreadStart: 37, spreadEnd: 63 },
    ),
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
    layout: createFormationLayout(
      { count: 1, lane: 90, spreadStart: 50, spreadEnd: 50 },
      { count: 3, lane: 70, spreadStart: 18, spreadEnd: 82 },
      { count: 3, lane: 50, spreadStart: 34, spreadEnd: 66 },
      { count: 2, lane: 34, spreadStart: 18, spreadEnd: 82 },
      { count: 2, lane: 10, spreadStart: 32, spreadEnd: 68 },
    ),
  },
  {
    id: '4-2-3-1',
    label: '4-2-3-1',
    description: '더블 볼란치와 2선 공격',
    slots: [
      'GK',
      '센터백',
      '센터백',
      '사이드백',
      '사이드백',
      '수비형 미드필더',
      '수비형 미드필더',
      '윙어',
      '공격형 미드필더',
      '윙어',
      '톱',
    ],
    layout: createFormationLayout(
      { count: 1, lane: 90, spreadStart: 50, spreadEnd: 50 },
      { count: 4, lane: 70, spreadStart: 18, spreadEnd: 82 },
      { count: 2, lane: 54, spreadStart: 38, spreadEnd: 62 },
      { count: 3, lane: 32, spreadStart: 20, spreadEnd: 80 },
      { count: 1, lane: 10, spreadStart: 50, spreadEnd: 50 },
    ),
  },
  {
    id: '4-1-4-1',
    label: '4-1-4-1',
    description: '수비형 미드필더 중심의 안정적인 배치',
    slots: [
      'GK',
      '센터백',
      '센터백',
      '사이드백',
      '사이드백',
      '수비형 미드필더',
      '윙어',
      '미드필더',
      '미드필더',
      '윙어',
      '톱',
    ],
    layout: createFormationLayout(
      { count: 1, lane: 90, spreadStart: 50, spreadEnd: 50 },
      { count: 4, lane: 70, spreadStart: 18, spreadEnd: 82 },
      { count: 1, lane: 56, spreadStart: 50, spreadEnd: 50 },
      { count: 4, lane: 38, spreadStart: 18, spreadEnd: 82 },
      { count: 1, lane: 10, spreadStart: 50, spreadEnd: 50 },
    ),
  },
  {
    id: '3-4-3',
    label: '3-4-3',
    description: '쓰리백과 전방 압박',
    slots: [
      'GK',
      '센터백',
      '센터백',
      '센터백',
      '사이드백',
      '미드필더',
      '미드필더',
      '사이드백',
      '윙어',
      '톱',
      '윙어',
    ],
    layout: createFormationLayout(
      { count: 1, lane: 90, spreadStart: 50, spreadEnd: 50 },
      { count: 3, lane: 70, spreadStart: 18, spreadEnd: 82 },
      { count: 4, lane: 42, spreadStart: 18, spreadEnd: 82 },
      { count: 3, lane: 14, spreadStart: 18, spreadEnd: 82 },
    ),
  },
  {
    id: '5-3-2',
    label: '5-3-2',
    description: '파이브백과 중앙 중심 운영',
    slots: [
      'GK',
      '센터백',
      '센터백',
      '센터백',
      '사이드백',
      '사이드백',
      '수비형 미드필더',
      '미드필더',
      '미드필더',
      '톱',
      '톱',
    ],
    layout: createFormationLayout(
      { count: 1, lane: 90, spreadStart: 50, spreadEnd: 50 },
      { count: 5, lane: 70, spreadStart: 10, spreadEnd: 90 },
      { count: 3, lane: 48, spreadStart: 34, spreadEnd: 66 },
      { count: 2, lane: 10, spreadStart: 32, spreadEnd: 68 },
    ),
  },
];

export const demoPlayers: Player[] = [
  {
    id: 'p-01',
    name: '김민준',
    birthYear: 1998,
    preferredPositions: ['GK'],
    type: 'member',
  },
  {
    id: 'p-02',
    name: '이도윤',
    birthYear: 1995,
    preferredPositions: ['센터백', '사이드백'],
    type: 'member',
  },
  {
    id: 'p-03',
    name: '박서준',
    birthYear: 1991,
    preferredPositions: ['센터백', '수비형 미드필더'],
    type: 'member',
  },
  {
    id: 'p-04',
    name: '최현우',
    birthYear: 1997,
    preferredPositions: ['사이드백', '윙어'],
    type: 'member',
  },
  {
    id: 'p-05',
    name: '정우진',
    birthYear: 1988,
    preferredPositions: ['센터백', '사이드백'],
    type: 'member',
  },
  {
    id: 'p-06',
    name: '한지훈',
    birthYear: 1994,
    preferredPositions: ['수비형 미드필더', '미드필더'],
    type: 'member',
  },
  {
    id: 'p-07',
    name: '오준호',
    birthYear: 1999,
    preferredPositions: ['미드필더', '공격형 미드필더'],
    type: 'member',
  },
  {
    id: 'p-08',
    name: '윤태양',
    birthYear: 1992,
    preferredPositions: ['미드필더', '윙어'],
    type: 'member',
  },
  {
    id: 'p-09',
    name: '임성민',
    birthYear: 1996,
    preferredPositions: ['윙어', '톱'],
    type: 'member',
  },
  {
    id: 'p-10',
    name: '장민재',
    birthYear: 2000,
    preferredPositions: ['윙어', '공격형 미드필더'],
    type: 'member',
  },
  {
    id: 'p-11',
    name: '조현석',
    birthYear: 1990,
    preferredPositions: ['톱', '윙어'],
    type: 'member',
  },
  {
    id: 'p-12',
    name: '신재원',
    birthYear: 2001,
    preferredPositions: ['공격형 미드필더', '미드필더'],
    type: 'member',
  },
  {
    id: 'p-13',
    name: '강민호',
    birthYear: 1985,
    preferredPositions: ['센터백', '수비형 미드필더'],
    type: 'member',
  },
  {
    id: 'p-14',
    name: '배준영',
    birthYear: 1993,
    preferredPositions: ['톱', '윙어'],
    type: 'member',
  },
  {
    id: 'p-15',
    name: '유승우',
    birthYear: 1997,
    preferredPositions: ['포지션 상관없음'],
    type: 'member',
  },
  {
    id: 'p-16',
    name: '문지환',
    birthYear: 1989,
    preferredPositions: ['미드필더', '사이드백'],
    type: 'member',
  },
  {
    id: 'p-17',
    name: '서준혁',
    birthYear: 1996,
    preferredPositions: ['포지션 상관없음'],
    type: 'guest',
  },
  {
    id: 'p-18',
    name: '권도현',
    birthYear: 1994,
    preferredPositions: ['센터백', '미드필더'],
    type: 'guest',
  },
];

function getPositionFamily(position: Position): string | undefined {
  if (position === 'GK' || position === '골키퍼') return '골키퍼';
  if (position.includes('센터백')) return '센터백';
  if (position.includes('사이드백')) return '사이드백';
  if (position.includes('수비형 미드필더')) return '수비형 미드필더';
  if (position.includes('공격형 미드필더')) return '공격형 미드필더';
  if (
    position === '미드필더' ||
    position === '중앙 미드필더' ||
    position === '왼쪽 미드필더' ||
    position === '오른쪽 미드필더'
  ) {
    return '미드필더';
  }
  if (position === '윙어' || position.endsWith('윙')) return '윙어';
  if (
    position === '톱' ||
    position === '원톱' ||
    position === '왼쪽 투톱' ||
    position === '오른쪽 투톱'
  ) {
    return '톱';
  }
  return undefined;
}

function positionScore(player: Player, position: Position): number {
  if (player.preferredPositions.includes('포지션 상관없음')) {
    return 1;
  }

  const positionFamily = getPositionFamily(position);
  const preferenceIndex = player.preferredPositions.findIndex(
    (preferredPosition) =>
      preferredPosition === position ||
      (positionFamily !== undefined &&
        getPositionFamily(preferredPosition) === positionFamily),
  );

  if (preferenceIndex >= 0) {
    return 100 - preferenceIndex * 20;
  }

  const relatedFamilies: Record<string, string[]> = {
    센터백: ['사이드백', '수비형 미드필더'],
    사이드백: ['센터백', '윙어'],
    '수비형 미드필더': ['미드필더', '센터백'],
    미드필더: ['수비형 미드필더', '공격형 미드필더'],
    '공격형 미드필더': ['미드필더', '윙어'],
    윙어: ['톱', '사이드백', '공격형 미드필더'],
    톱: ['윙어', '공격형 미드필더'],
  };

  if (
    positionFamily &&
    relatedFamilies[positionFamily]?.some((family) =>
      player.preferredPositions.some(
        (preferredPosition) => getPositionFamily(preferredPosition) === family,
      ),
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
    const selectedIndex = formations.findIndex(
      ({ id }) => id === selectedFormationId,
    );
    const startIndex = selectedIndex < 0 ? 0 : selectedIndex;

    return formations[(startIndex + quarterIndex) % formations.length]!;
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
  isVerticalPitch = true,
}: {
  players: Player[];
  quarterCount: number;
  mode: FormationMode;
  formationId: string;
  minimumQuarters: number;
  isVerticalPitch?: boolean;
}): QuarterLineup[] {
  const playCounts = new Map(players.map(({ id }) => [id, 0]));

  return Array.from({ length: quarterCount }, (_, quarterIndex) => {
    const formation = chooseFormation(mode, formationId, quarterIndex, players);
    const availablePlayers = [...players];
    const slots = formation.slots.map((position, slotIndex) => {
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

      const coordinates = getFormationPlayerCoordinates(
        formation,
        position,
        slotIndex,
        isVerticalPitch,
      );

      return {
        position,
        playerId: player?.id ?? null,
        ...coordinates,
      };
    });

    return { formationId: formation.id, slots };
  });
}
