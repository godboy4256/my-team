import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, TextInput } from './components';
import {
  createLineups,
  detectFormationLabel,
  demoPlayers,
  formations,
  getFormationPlayerCoordinates,
  positions,
} from './features/lineup/lineup';
import type {
  FormationMode,
  Player,
  Position,
  QuarterLineup,
} from './features/lineup/lineup';

const STORAGE_KEY = 'my-team-lineup-v1';
const LINEUP_STORAGE_KEY = 'my-team-lineups-v7';
const SECOND_TEAM_LINEUP_STORAGE_KEY = 'my-team-lineups-team-b-v1';
const FORMATION_ID = '4-3-3';

function createInitialLineups(
  players: Player[],
  isVerticalPitch = true,
): QuarterLineup[] {
  return createLineups({
    players,
    quarterCount: 4,
    mode: 'same',
    formationId: FORMATION_ID,
    minimumQuarters: 2,
    isVerticalPitch,
  });
}

type StoredState = {
  players: Player[];
  selectedPlayerIds: string[];
  isSampleData: boolean;
};

type SetupStep = 1 | 2 | 3;
type MatchMode = 'scrimmage' | 'match';
type LineupCreationMode = 'auto' | 'manual';

function getPlayerAge(birthYear: number) {
  return new Date().getFullYear() - birthYear;
}

const legacyPositionChoices: Readonly<Record<string, Position[]>> = {
  GK: ['골키퍼'],
  센터백: ['왼쪽 센터백', '오른쪽 센터백'],
  사이드백: ['오른쪽 사이드백', '왼쪽 사이드백'],
  '수비형 미드필더': [
    '왼쪽 수비형 미드필더',
    '중앙 수비형 미드필더',
    '오른쪽 수비형 미드필더',
  ],
  미드필더: ['왼쪽 미드필더', '중앙 미드필더', '오른쪽 미드필더'],
  '공격형 미드필더': [
    '왼쪽 공격형 미드필더',
    '중앙 공격형 미드필더',
    '오른쪽 공격형 미드필더',
  ],
  윙어: ['왼쪽 윙', '오른쪽 윙'],
  톱: ['원톱', '왼쪽 투톱', '오른쪽 투톱'],
};

function normalizePositionPreferences(value: unknown): Position[] {
  if (!Array.isArray(value)) return [];

  return [
    ...new Set(
      value.flatMap((item): Position[] => {
        if (typeof item !== 'string') return [];
        if (legacyPositionChoices[item]) return legacyPositionChoices[item];
        return positions.includes(item as (typeof positions)[number])
          ? [item as Position]
          : [];
      }),
    ),
  ];
}

function PlayerTypeBadge({ type }: { type: Player['type'] }) {
  return (
    <span
      className={`player-type-tag ${type === 'guest' ? 'player-type-tag-guest' : ''}`}
    >
      {type === 'guest' ? '용병' : '회원'}
    </span>
  );
}

function normalizeStoredPlayers(value: unknown): Player[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item): Player[] => {
    if (typeof item !== 'object' || item === null || !('id' in item)) {
      return [];
    }
    const player = item as Partial<Player> & { age?: number };
    const birthYear =
      typeof player.birthYear === 'number'
        ? player.birthYear
        : typeof player.age === 'number'
          ? new Date().getFullYear() - player.age
          : null;
    const preferredPositions = normalizePositionPreferences(
      player.preferredPositions,
    );
    if (
      typeof player.id !== 'string' ||
      typeof player.name !== 'string' ||
      birthYear === null ||
      preferredPositions.length === 0 ||
      (player.type !== 'member' && player.type !== 'guest')
    ) {
      return [];
    }
    return [{ ...player, birthYear, preferredPositions } as Player];
  });
}

function readStoredState(): StoredState {
  try {
    const value = localStorage.getItem(STORAGE_KEY);

    if (value) {
      const parsed: unknown = JSON.parse(value);

      if (
        typeof parsed === 'object' &&
        parsed !== null &&
        'players' in parsed &&
        'selectedPlayerIds' in parsed &&
        Array.isArray(parsed.players) &&
        Array.isArray(parsed.selectedPlayerIds)
      ) {
        const savedPlayers = normalizeStoredPlayers(parsed.players);
        const isDemoRoster =
          savedPlayers.length === demoPlayers.length &&
          savedPlayers.every(
            (player, index) => player.id === demoPlayers[index]?.id,
          );

        return {
          players: savedPlayers,
          selectedPlayerIds: parsed.selectedPlayerIds as string[],
          isSampleData:
            ('isSampleData' in parsed && parsed.isSampleData === true) ||
            isDemoRoster,
        };
      }
    }
  } catch {
    // 브라우저 저장소를 사용할 수 없는 경우 예시 명단으로 시작합니다.
  }

  return {
    players: normalizeStoredPlayers(demoPlayers),
    selectedPlayerIds: demoPlayers.map(({ id }) => id),
    isSampleData: true,
  };
}

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const initialState = useMemo(readStoredState, []);
  const [players, setPlayers] = useState<Player[]>(initialState.players);
  const [isSampleData, setIsSampleData] = useState(initialState.isSampleData);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>(
    initialState.selectedPlayerIds,
  );
  const [quarterCount, setQuarterCount] = useState(4);
  const [quarterCountInput, setQuarterCountInput] = useState('4');
  const [minimumQuarters, setMinimumQuarters] = useState(2);
  const [minimumQuartersInput, setMinimumQuartersInput] = useState('2');
  const [formationMode, setFormationMode] = useState<FormationMode>('same');
  const [formationId, setFormationId] = useState('4-3-3');
  const [matchMode, setMatchMode] = useState<MatchMode>('scrimmage');
  const [lineupCreationMode, setLineupCreationMode] =
    useState<LineupCreationMode>('auto');
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [lineups, setLineups] = useState<QuarterLineup[]>(() => {
    try {
      const stored = localStorage.getItem(LINEUP_STORAGE_KEY);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return parsed as QuarterLineup[];
        }
      }
    } catch {
      // 오래되었거나 깨진 전술보드는 새 초기 배치로 교체합니다.
    }

    const attendees = initialState.players.filter(({ id }) =>
      initialState.selectedPlayerIds.includes(id),
    );

    return attendees.length
      ? createInitialLineups(
          attendees,
          window.matchMedia('(max-width: 47.999rem)').matches,
        )
      : [];
  });
  const [secondTeamLineups, setSecondTeamLineups] = useState<QuarterLineup[]>(
    () => {
      try {
        const stored = localStorage.getItem(SECOND_TEAM_LINEUP_STORAGE_KEY);
        if (stored) {
          const parsed: unknown = JSON.parse(stored);
          if (Array.isArray(parsed)) return parsed as QuarterLineup[];
        }
      } catch {
        // 저장 데이터가 손상된 경우 자체전 두 번째 팀은 비워 둡니다.
      }
      return [];
    },
  );
  const [activeTeam, setActiveTeam] = useState<'A' | 'B'>('A');
  const [activeQuarter, setActiveQuarter] = useState(0);
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [setupStep, setSetupStep] = useState<SetupStep>(1);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);
  const [playerCreatedName, setPlayerCreatedName] = useState('');
  const [changingSlotIndex, setChangingSlotIndex] = useState<number | null>(
    null,
  );
  const [playerFormSource, setPlayerFormSource] = useState<
    'menu' | 'attendees'
  >('menu');
  const [attendeeSearch, setAttendeeSearch] = useState('');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerBirthYear, setNewPlayerBirthYear] = useState('');
  const [newPlayerPositions, setNewPlayerPositions] = useState<Position[]>([]);
  const [newPlayerType, setNewPlayerType] = useState<Player['type']>('member');
  const [notice, setNotice] = useState('');
  const [isVerticalPitch, setIsVerticalPitch] = useState(
    () => window.matchMedia('(max-width: 47.999rem)').matches,
  );
  const pitchRef = useRef<HTMLDivElement>(null);
  const dragPlayerId = useRef<string | null>(null);
  const dragOffset = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const previousPitchOrientation = useRef(isVerticalPitch);
  const [dragPosition, setDragPosition] = useState<{
    playerId: string;
    x: number;
    y: number;
  } | null>(null);
  const isTeamManagementPage = location.pathname === '/team';

  useEffect(() => {
    document.title = isTeamManagementPage ? '팀 목록 | MYTEAM' : 'MYTEAM';
  }, [isTeamManagementPage]);

  function navigateTo(path: '/' | '/team') {
    navigate(path);
  }

  const selectedPlayers = useMemo(
    () => players.filter(({ id }) => selectedPlayerIds.includes(id)),
    [players, selectedPlayerIds],
  );
  const activeTeamLineups = activeTeam === 'A' ? lineups : secondTeamLineups;
  const activeTeamPlayers =
    matchMode === 'scrimmage'
      ? [...selectedPlayers]
          .sort((first, second) => first.type.localeCompare(second.type))
          .filter((_, index) => index % 2 === (activeTeam === 'A' ? 0 : 1))
      : selectedPlayers;
  const activeLineup = activeTeamLineups[activeQuarter];
  const activeFormation = formations.find(
    ({ id }) => id === activeLineup?.formationId,
  );
  const detectedFormationLabel = detectFormationLabel(
    activeLineup,
    isVerticalPitch,
    activeFormation?.label ?? formationId,
  );
  useEffect(() => {
    const nextMinimum = Math.min(minimumQuarters, quarterCount);

    if (nextMinimum !== minimumQuarters) {
      setMinimumQuarters(nextMinimum);
      setMinimumQuartersInput(String(nextMinimum));
    }
  }, [minimumQuarters, quarterCount]);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 47.999rem)');
    const updatePitchOrientation = () => {
      const nextOrientation = mediaQuery.matches;

      if (previousPitchOrientation.current === nextOrientation) return;

      previousPitchOrientation.current = nextOrientation;
      setIsVerticalPitch(nextOrientation);
      setDragPosition(null);
    };

    updatePitchOrientation();
    mediaQuery.addEventListener('change', updatePitchOrientation);

    return () =>
      mediaQuery.removeEventListener('change', updatePitchOrientation);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ players, selectedPlayerIds, isSampleData }),
      );
    } catch {
      setNotice(
        '브라우저에 저장할 수 없어 현재 화면에서만 변경사항을 유지합니다.',
      );
    }
  }, [players, selectedPlayerIds, isSampleData]);

  useEffect(() => {
    try {
      localStorage.setItem(LINEUP_STORAGE_KEY, JSON.stringify(lineups));
    } catch {
      setNotice('전술판 위치를 저장하지 못했습니다.');
    }
  }, [lineups]);

  useEffect(() => {
    try {
      localStorage.setItem(
        SECOND_TEAM_LINEUP_STORAGE_KEY,
        JSON.stringify(secondTeamLineups),
      );
    } catch {
      setNotice('자체전 두 번째 팀의 전술판 위치를 저장하지 못했습니다.');
    }
  }, [secondTeamLineups]);

  function toggleAttendance(playerId: string) {
    setSelectedPlayerIds((current) =>
      current.includes(playerId)
        ? current.filter((id) => id !== playerId)
        : [...current, playerId],
    );
  }

  function toggleAllAttendance() {
    setSelectedPlayerIds(
      selectedPlayers.length === players.length
        ? []
        : players.map(({ id }) => id),
    );
  }

  function updateQuarterCount(value: string) {
    setQuarterCountInput(value);
    if (!value) return;

    const nextCount = Number(value);
    if (!Number.isInteger(nextCount) || nextCount < 1 || nextCount > 12) {
      return;
    }

    setQuarterCount(nextCount);
    const nextMinimum = Math.min(minimumQuarters, nextCount);

    if (nextMinimum !== minimumQuarters) {
      setMinimumQuarters(nextMinimum);
      setMinimumQuartersInput(String(nextMinimum));
    }
  }

  function updateMinimumQuarters(value: string) {
    setMinimumQuartersInput(value);
    if (!value) return;

    const nextMinimum = Number(value);
    if (!Number.isInteger(nextMinimum) || nextMinimum < 0) return;

    const validatedMinimum = Math.min(nextMinimum, quarterCount);
    setMinimumQuarters(validatedMinimum);
    setMinimumQuartersInput(String(validatedMinimum));
  }

  function generateLineups() {
    if (selectedPlayers.length === 0) {
      setNotice('오늘 경기 참석 선수를 한 명 이상 선택해 주세요.');
      setSetupStep(1);
      return;
    }

    const lineupOptions = {
      players: selectedPlayers,
      quarterCount,
      mode: formationMode,
      formationId,
      minimumQuarters,
      isVerticalPitch,
    };
    const createTeamLineups = (teamPlayers: Player[]) => {
      const generated = createLineups({
        ...lineupOptions,
        players: teamPlayers,
      });
      if (lineupCreationMode === 'auto') return generated;

      return generated.map((quarter) => ({
        ...quarter,
        slots: quarter.slots.map((slot) => ({ ...slot, playerId: null })),
      }));
    };

    if (matchMode === 'scrimmage') {
      const orderedPlayers = [...selectedPlayers].sort((first, second) =>
        first.type.localeCompare(second.type),
      );
      const teamAPlayers = orderedPlayers.filter((_, index) => index % 2 === 0);
      const teamBPlayers = orderedPlayers.filter((_, index) => index % 2 === 1);
      setLineups(createTeamLineups(teamAPlayers));
      setSecondTeamLineups(createTeamLineups(teamBPlayers));
      setActiveTeam('A');
    } else {
      setLineups(createTeamLineups(selectedPlayers));
      setSecondTeamLineups([]);
      setActiveTeam('A');
    }
    setActiveQuarter(0);
    setIsSetupOpen(false);
    setSetupStep(1);
    setNotice(
      matchMode === 'scrimmage'
        ? `자체전 팀 A ${Math.ceil(selectedPlayers.length / 2)}명 · 팀 B ${Math.floor(selectedPlayers.length / 2)}명으로 ${quarterCount}쿼터 라인업을 만들었습니다.`
        : `${selectedPlayers.length}명 참석 · ${quarterCount}쿼터 라인업을 만들었습니다.`,
    );
  }

  function addPlayer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newPlayerName.trim();
    const birthYear = Number(newPlayerBirthYear);
    const age = getPlayerAge(birthYear);

    if (!name || !Number.isInteger(birthYear) || age < 15 || age > 90) {
      setNotice('이름과 15~90세에 해당하는 출생 연도를 입력해 주세요.');
      return;
    }

    if (newPlayerPositions.length === 0) {
      setNotice('선호 포지션을 하나 이상 선택해 주세요.');
      return;
    }

    const player: Player = {
      id: editingPlayerId ?? crypto.randomUUID(),
      name,
      birthYear,
      preferredPositions: newPlayerPositions,
      type: newPlayerType,
    };
    const isEditingPlayer = editingPlayerId !== null;
    const shouldReplaceSampleRoster =
      !isEditingPlayer && isSampleData && playerFormSource === 'menu';

    setPlayers((current) =>
      shouldReplaceSampleRoster
        ? [player]
        : isEditingPlayer
          ? current.map((item) => (item.id === player.id ? player : item))
          : [...current, player],
    );
    setIsSampleData(shouldReplaceSampleRoster ? false : isSampleData);
    if (!isEditingPlayer) {
      setSelectedPlayerIds((current) =>
        shouldReplaceSampleRoster ? [player.id] : [...current, player.id],
      );
    }
    setNewPlayerName('');
    setNewPlayerBirthYear('');
    setNewPlayerPositions([]);
    setNewPlayerType('member');
    setNotice(isEditingPlayer ? `${name} 선수 정보를 수정했습니다.` : '');
    setPlayerCreatedName(
      !isEditingPlayer && playerFormSource === 'menu' && !isTeamManagementPage
        ? name
        : '',
    );
    setEditingPlayerId(null);
    setIsAddingPlayer(false);
  }

  function editPlayer(player: Player) {
    setEditingPlayerId(player.id);
    setPlayerFormSource('menu');
    setNewPlayerName(player.name);
    setNewPlayerBirthYear(String(player.birthYear));
    setNewPlayerPositions(player.preferredPositions);
    setNewPlayerType(player.type);
    setIsAddingPlayer(true);
  }

  function closePlayerForm() {
    setIsAddingPlayer(false);
    setEditingPlayerId(null);
    setNewPlayerName('');
    setNewPlayerBirthYear('');
    setNewPlayerPositions([]);
    setNewPlayerType('member');
  }

  function clearPitchLineup() {
    setLineups([]);
    setSecondTeamLineups([]);
    setActiveQuarter(0);
    setActiveTeam('A');
    setNotice('전술 보드를 비웠습니다. 등록된 선수 명단은 유지됩니다.');
  }

  function replaceSlotPlayer(slotIndex: number, playerId: string) {
    const updateLineup = (current: QuarterLineup[]) =>
      current.map((quarter, index) => {
        if (index !== activeQuarter) return quarter;
        return {
          ...quarter,
          slots: quarter.slots.map((slot, index) =>
            index === slotIndex ? { ...slot, playerId } : slot,
          ),
        };
      });

    if (activeTeam === 'A') setLineups(updateLineup);
    else setSecondTeamLineups(updateLineup);
    setChangingSlotIndex(null);
  }

  function assignPlayerToNextSlot(playerId: string) {
    const currentLineups = activeTeam === 'A' ? lineups : secondTeamLineups;
    const currentQuarter = currentLineups[activeQuarter];
    if (
      !currentQuarter ||
      currentQuarter.slots.some((slot) => slot.playerId === playerId)
    ) {
      return;
    }

    const updateLineup = (current: QuarterLineup[]) =>
      current.map((quarter, index) => {
        if (index !== activeQuarter) return quarter;

        let assigned = false;
        return {
          ...quarter,
          slots: quarter.slots.map((slot) => {
            if (!assigned && slot.playerId === null) {
              assigned = true;
              return { ...slot, playerId };
            }
            return slot;
          }),
        };
      });

    if (activeTeam === 'A') setLineups(updateLineup);
    else setSecondTeamLineups(updateLineup);
  }

  function toggleNewPlayerPosition(position: Position) {
    setNewPlayerPositions((current) => {
      if (position === '포지션 상관없음') {
        return current.includes(position) ? [] : [position];
      }

      const withoutAny = current.filter((item) => item !== '포지션 상관없음');

      if (withoutAny.includes(position)) {
        return withoutAny.filter((item) => item !== position);
      }

      return withoutAny.length < 6 ? [...withoutAny, position] : withoutAny;
    });
  }

  function getPlayerCoordinates(clientX: number, clientY: number) {
    const pitch = pitchRef.current;
    if (!pitch) return null;

    const bounds = pitch.getBoundingClientRect();
    const localX =
      clientX -
      bounds.left -
      dragOffset.current.x +
      dragOffset.current.width / 2;
    const localY =
      clientY -
      bounds.top -
      dragOffset.current.y +
      dragOffset.current.height / 2;
    const markerHalfWidth = (dragOffset.current.width / 2 / bounds.width) * 100;
    const markerHalfHeight =
      (dragOffset.current.height / 2 / bounds.height) * 100;
    const x = Math.min(
      100 - markerHalfWidth,
      Math.max(markerHalfWidth, (localX / bounds.width) * 100),
    );
    const y = Math.min(
      100 - markerHalfHeight,
      Math.max(markerHalfHeight, (localY / bounds.height) * 100),
    );

    return { x, y };
  }

  function endDrag() {
    dragPlayerId.current = null;
  }

  function savePlayerPosition(
    playerId: string,
    coordinates: { x: number; y: number },
  ) {
    const updateLineup = (current: QuarterLineup[]) =>
      current.map((quarter, index) => {
        if (index !== activeQuarter) return quarter;

        return {
          ...quarter,
          slots: quarter.slots.map((slot) =>
            slot.playerId === playerId ? { ...slot, ...coordinates } : slot,
          ),
        };
      });

    if (activeTeam === 'A') {
      setLineups(updateLineup);
    } else {
      setSecondTeamLineups(updateLineup);
    }
  }

  function handlePlayerPointerDown(
    event: ReactPointerEvent<HTMLButtonElement>,
    playerId: string,
    x: number,
    y: number,
  ) {
    if (event.button !== 0) return;
    const markerBounds = event.currentTarget.getBoundingClientRect();
    dragPlayerId.current = playerId;
    dragOffset.current = {
      x: event.clientX - markerBounds.left,
      y: event.clientY - markerBounds.top,
      width: markerBounds.width,
      height: markerBounds.height,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.classList.add('is-dragging');
    setDragPosition({ playerId, x, y });
  }

  function handlePlayerPointerMove(
    event: ReactPointerEvent<HTMLButtonElement>,
    playerId: string,
  ) {
    if (dragPlayerId.current !== playerId) return;

    const coordinates = getPlayerCoordinates(event.clientX, event.clientY);
    if (!coordinates) return;

    setDragPosition({ playerId, ...coordinates });
    savePlayerPosition(playerId, coordinates);
  }

  function handlePlayerPointerUp(
    event: ReactPointerEvent<HTMLButtonElement>,
    playerId: string,
  ) {
    if (dragPlayerId.current !== playerId) return;

    const coordinates = getPlayerCoordinates(event.clientX, event.clientY);
    if (coordinates) {
      savePlayerPosition(playerId, coordinates);
    }
    event.currentTarget.classList.remove('is-dragging');
    setDragPosition(null);
    endDrag();
  }

  return (
    <main className="app-shell bg-canvas text-ink">
      <header className="app-header flex items-center justify-between border-b border-line bg-surface px-3 sm:px-5">
        <a
          className="group flex items-center gap-2.5"
          href="/"
          aria-label="MYTEAM 홈"
        >
          <span className="relative grid size-10 place-items-center overflow-hidden rounded-2xl bg-brand-800 text-white shadow-sm ring-1 ring-brand-900/10 transition-transform group-hover:-rotate-3">
            <span className="absolute -right-2 -top-3 size-8 rounded-full bg-brand-600/70" />
            <svg
              className="relative size-7"
              viewBox="0 0 32 32"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M16 3.75 26.5 9.8v12.4L16 28.25 5.5 22.2V9.8L16 3.75Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
                opacity=".68"
              />
              <path
                d="m16 9.1 4.2 3.05-1.6 4.95h-5.2l-1.6-4.95L16 9.1Z"
                fill="currentColor"
              />
              <path
                d="m16 9.1-2.2-4.3M20.2 12.15l5.8-2.35M18.6 17.1l3.2 4.55M13.4 17.1l-3.2 4.55M12.8 12.15 6 9.8"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity=".9"
              />
              <circle cx="25.2" cy="6.8" r="2" fill="#B8E7A7" />
            </svg>
          </span>
          <span className="text-[17px] font-black leading-none tracking-[-0.06em] text-brand-900">
            MY<span className="text-brand-600">TEAM</span>
          </span>
        </a>
        <button
          type="button"
          className="grid size-11 place-items-center rounded-xl text-3xl leading-none text-ink hover:bg-surface-subtle"
          aria-label="메뉴 열기"
          aria-expanded={isMenuOpen}
          onClick={() => setIsMenuOpen((current) => !current)}
        >
          <span className="menu-icon" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>
        {isMenuOpen && (
          <div className="menu-popover absolute right-3 top-14 z-30 w-52 rounded-2xl border border-line bg-surface p-2 shadow-card">
            <a
              href="/team"
              className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold hover:bg-surface-subtle"
              onClick={(event) => {
                event.preventDefault();
                navigateTo('/team');
                setIsMenuOpen(false);
              }}
            >
              팀 관리
            </a>
            <button
              type="button"
              className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold hover:bg-surface-subtle"
              onClick={() => {
                setPlayerFormSource('menu');
                setNewPlayerType('member');
                setIsAddingPlayer(true);
                setIsMenuOpen(false);
              }}
            >
              선수 등록
            </button>
            <button
              type="button"
              className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold hover:bg-surface-subtle"
              onClick={() => {
                setIsSetupOpen(true);
                setSetupStep(1);
                setIsMenuOpen(false);
              }}
            >
              오늘 경기 참석자
            </button>
          </div>
        )}
      </header>

      {notice && (
        <div
          role="status"
          className="notice-bar flex items-center justify-between gap-3 bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-900"
        >
          <span>{notice}</span>
          <button
            type="button"
            className="shrink-0 font-bold"
            aria-label="알림 닫기"
            onClick={() => setNotice('')}
          >
            닫기
          </button>
        </div>
      )}

      {isTeamManagementPage && (
        <section className="team-management-page">
          <div className="team-page-content">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 id="team-management-title" className="text-2xl font-black">
                  팀 목록
                </h1>
              </div>
              <button
                type="button"
                className="modal-close grid size-11 place-items-center rounded-xl text-3xl text-ink hover:bg-surface-subtle"
                aria-label="팀 목록 닫기"
                onClick={() => navigateTo('/')}
              >
                ×
              </button>
            </div>
            <div className="flex justify-end">
              <Button
                size="sm"
                onClick={() => {
                  setPlayerFormSource('menu');
                  setNewPlayerType('member');
                  setIsAddingPlayer(true);
                }}
              >
                + 선수 등록
              </Button>
            </div>
            {players.length === 0 ? (
              <p className="rounded-2xl bg-surface-subtle p-5 text-center text-sm text-ink-muted">
                등록된 팀원이 없습니다.
              </p>
            ) : (
              <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
                {players.map((player) => (
                  <div
                    key={player.id}
                    className="flex min-h-16 items-center gap-3 px-4 py-3"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-100 font-extrabold text-brand-800">
                      {player.name.slice(0, 1)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold">
                        {player.name}
                        <span className="ml-2 text-xs font-medium text-ink-faint">
                          {player.birthYear}년생 · 만{' '}
                          {getPlayerAge(player.birthYear)}세
                        </span>
                      </span>
                      <span className="flex items-center gap-2">
                        <PlayerTypeBadge type={player.type} />
                        <span className="truncate text-xs text-ink-muted">
                          {player.preferredPositions.join(' · ')}
                        </span>
                      </span>
                    </span>
                    <button
                      type="button"
                      className="min-h-10 rounded-lg px-3 text-sm font-bold text-brand-700 hover:bg-brand-50"
                      onClick={() => {
                        editPlayer(player);
                      }}
                    >
                      수정
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {!isTeamManagementPage && playerCreatedName && (
        <div
          className="sheet-backdrop modal-backdrop"
          role="presentation"
          onClick={() => setPlayerCreatedName('')}
        >
          <section
            className="confirm-dialog motion-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="player-created-title"
            onClick={(event) => event.stopPropagation()}
          >
            <span
              className="grid size-12 place-items-center rounded-2xl bg-brand-100 text-2xl text-brand-800"
              aria-hidden="true"
            >
              ✓
            </span>
            <h2
              id="player-created-title"
              className="mt-4 text-lg font-extrabold"
            >
              팀원을 등록했어요
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              {playerCreatedName} 선수를 오늘 경기 참석자로 추가했습니다.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                onClick={() => setPlayerCreatedName('')}
              >
                확인
              </Button>
              <Button
                onClick={() => {
                  setPlayerCreatedName('');
                  navigateTo('/team');
                }}
              >
                팀 관리
              </Button>
            </div>
          </section>
        </div>
      )}

      {!isTeamManagementPage && changingSlotIndex !== null && activeLineup && (
        <div
          className="sheet-backdrop modal-backdrop"
          role="presentation"
          onClick={() => setChangingSlotIndex(null)}
        >
          <section
            className="confirm-dialog motion-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="change-player-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="change-player-title" className="text-lg font-extrabold">
                  선수를 교체하세요
                </h2>
                <p className="mt-1 text-sm text-ink-muted">
                  현재 쿼터의 이 자리에 배치할 선수를 선택합니다.
                </p>
              </div>
              <button
                type="button"
                className="modal-close grid size-11 shrink-0 place-items-center rounded-full text-3xl text-ink-muted hover:bg-surface-subtle"
                aria-label="선수 교체 닫기"
                onClick={() => setChangingSlotIndex(null)}
              >
                ×
              </button>
            </div>
            <div className="mt-4 grid max-h-64 gap-1 overflow-y-auto">
              {activeTeamPlayers
                .filter(
                  ({ id }) =>
                    !activeLineup.slots.some(
                      (slot, index) =>
                        index !== changingSlotIndex && slot.playerId === id,
                    ),
                )
                .map((player) => (
                  <button
                    key={player.id}
                    type="button"
                    className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-left hover:bg-surface-subtle"
                    onClick={() =>
                      replaceSlotPlayer(changingSlotIndex, player.id)
                    }
                  >
                    <span className="grid size-8 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-800">
                      {player.name.slice(0, 1)}
                    </span>
                    <span className="flex-1 text-sm font-bold">
                      {player.name}
                    </span>
                  </button>
                ))}
            </div>
          </section>
        </div>
      )}

      {!isTeamManagementPage && (
        <>
          <section className="board-area" aria-label="전술 보드">
            <div className="board-meta flex items-center justify-between px-3 py-2 text-xs font-bold text-ink-muted">
              <span>
                {activeQuarter + 1}쿼터 · {detectedFormationLabel}
              </span>
              <span>{activeTeamPlayers.length}명 참석</span>
            </div>

            <div ref={pitchRef} className="pitch">
              <div className="pitch-line pitch-border" />
              <div className="pitch-line pitch-halfway" />
              <div className="pitch-line pitch-center-circle" />
              <div className="pitch-line pitch-center-dot" />
              <div className="pitch-line pitch-box pitch-box-top" />
              <div className="pitch-line pitch-box pitch-box-bottom" />

              {activeLineup ? (
                <div className="player-layer">
                  {activeLineup.slots.map((slot, slotIndex) => {
                    const currentPlayer = activeTeamPlayers.find(
                      ({ id }) => id === slot.playerId,
                    );
                    if (!slot.playerId || !currentPlayer) return null;

                    const initialCoordinates =
                      Number.isFinite(slot.x) && Number.isFinite(slot.y)
                        ? { x: slot.x, y: slot.y }
                        : getFormationPlayerCoordinates(
                            activeFormation ?? formations[0]!,
                            slot.position,
                            slotIndex,
                            isVerticalPitch,
                          );
                    const displayCoordinates =
                      dragPosition?.playerId === currentPlayer.id
                        ? dragPosition
                        : initialCoordinates;

                    return (
                      <button
                        key={`${currentPlayer.id}-${slotIndex}`}
                        type="button"
                        className={`player-marker ${currentPlayer.type === 'guest' ? 'player-marker-guest' : 'player-marker-member'}`}
                        aria-label={`${currentPlayer.name}, ${currentPlayer.type === 'guest' ? '용병' : '회원'}, 전술 보드에서 드래그해 위치 이동`}
                        style={{
                          left: `${displayCoordinates.x}%`,
                          top: `${displayCoordinates.y}%`,
                        }}
                        onContextMenu={(event) => {
                          event.preventDefault();
                          setChangingSlotIndex(slotIndex);
                        }}
                        onPointerDown={(event) =>
                          handlePlayerPointerDown(
                            event,
                            currentPlayer.id,
                            displayCoordinates.x,
                            displayCoordinates.y,
                          )
                        }
                        onPointerMove={(event) =>
                          handlePlayerPointerMove(event, currentPlayer.id)
                        }
                        onPointerUp={(event) =>
                          handlePlayerPointerUp(event, currentPlayer.id)
                        }
                        onPointerCancel={(event) =>
                          handlePlayerPointerUp(event, currentPlayer.id)
                        }
                        onLostPointerCapture={(event) => {
                          if (dragPlayerId.current === currentPlayer.id) {
                            handlePlayerPointerUp(event, currentPlayer.id);
                          }
                        }}
                      >
                        <span className="player-name">
                          {currentPlayer.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="board-empty">
                  <span className="text-3xl" aria-hidden="true">
                    ⚽
                  </span>
                  <p className="mt-2 text-base font-extrabold">전술 보드</p>
                  <p className="mt-1 text-xs text-white/80">
                    아래에서 빠른 배치나 직접 짜기를 선택하세요.
                  </p>
                </div>
              )}
            </div>

            {lineups.length > 0 && (
              <>
                {matchMode === 'scrimmage' && secondTeamLineups.length > 0 && (
                  <div className="flex gap-2 border-t border-line bg-surface px-3 py-2">
                    {(['A', 'B'] as const).map((team) => (
                      <button
                        key={team}
                        type="button"
                        aria-pressed={activeTeam === team}
                        onClick={() => setActiveTeam(team)}
                        className={`min-h-9 flex-1 rounded-lg text-sm font-extrabold ${activeTeam === team ? 'bg-brand-700 text-white' : 'bg-surface-subtle text-ink-muted'}`}
                      >
                        팀 {team} ·{' '}
                        {team === 'A'
                          ? Math.ceil(selectedPlayers.length / 2)
                          : Math.floor(selectedPlayers.length / 2)}
                        명
                      </button>
                    ))}
                  </div>
                )}
                <div className="quarter-tabs flex gap-2 overflow-x-auto px-3 py-2">
                  {activeTeamLineups.map((quarter, index) => (
                    <button
                      key={`${quarter.formationId}-${index}`}
                      type="button"
                      aria-pressed={activeQuarter === index}
                      onClick={() => setActiveQuarter(index)}
                      className={`min-h-9 shrink-0 rounded-lg px-4 text-sm font-bold ${activeQuarter === index ? 'bg-brand-700 text-white' : 'bg-surface-subtle text-ink-muted'}`}
                    >
                      {index + 1}쿼터
                    </button>
                  ))}
                  <span className="ml-auto self-center whitespace-nowrap text-xs font-bold text-ink-muted">
                    {detectedFormationLabel}
                  </span>
                </div>
              </>
            )}
            {lineups.length > 0 && lineupCreationMode === 'manual' && (
              <div className="border-t border-line bg-surface px-3 py-2">
                <p className="mb-2 text-xs font-bold text-ink-muted">
                  미배치 선수 · 눌러서 빈 자리에 배치
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {activeTeamPlayers
                    .filter(
                      ({ id }) =>
                        !activeLineup?.slots.some(
                          (slot) => slot.playerId === id,
                        ),
                    )
                    .map((player) => (
                      <button
                        key={player.id}
                        type="button"
                        className="min-h-9 shrink-0 rounded-full border border-brand-200 bg-brand-50 px-3 text-xs font-bold text-brand-900"
                        onClick={() => assignPlayerToNextSlot(player.id)}
                      >
                        + {player.name}
                      </button>
                    ))}
                  {activeTeamPlayers.every(({ id }) =>
                    activeLineup?.slots.some((slot) => slot.playerId === id),
                  ) && (
                    <span className="py-2 text-xs text-ink-faint">
                      모든 선수를 배치했습니다.
                    </span>
                  )}
                </div>
              </div>
            )}
          </section>

          <footer className="app-footer grid grid-cols-2 gap-2 border-t border-line bg-surface px-3 py-2.5">
            <Button
              className="col-span-2 w-full"
              size="md"
              onClick={() => {
                setLineupCreationMode('auto');
                setIsSetupOpen(true);
                setSetupStep(1);
                setNotice('');
              }}
            >
              <span aria-hidden="true">✦</span>
              라인업 빨리 짜기
            </Button>
            <Button
              variant="secondary"
              className="w-full"
              size="sm"
              onClick={() => {
                setLineupCreationMode('manual');
                setIsSetupOpen(true);
                setSetupStep(1);
                setNotice('');
              }}
            >
              직접 짜기
            </Button>
            <button
              type="button"
              className="min-h-12 rounded-xl border border-line px-3 text-sm font-bold text-ink-muted hover:bg-surface-subtle"
              onClick={clearPitchLineup}
              aria-label="전술 보드 비우기"
            >
              보드 비우기
            </button>
          </footer>
        </>
      )}

      {isSetupOpen && (
        <div
          className="sheet-backdrop"
          role="presentation"
          onClick={() => setIsSetupOpen(false)}
        >
          <section
            className="setup-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="setup-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sheet-handle" />
            <div className="flex items-start justify-between gap-3 px-4 pb-3">
              <div>
                <p className="text-xs font-bold text-brand-700">
                  {setupStep} / 3 단계
                </p>
                <h2 id="setup-title" className="mt-0.5 text-lg font-extrabold">
                  {setupStep === 1
                    ? '오늘 참석자'
                    : setupStep === 2
                      ? '경기 방식'
                      : '라인업 설정'}
                </h2>
              </div>
              <button
                type="button"
                className="modal-close grid size-11 place-items-center rounded-full text-3xl text-ink-muted hover:bg-surface-subtle"
                aria-label="설정 닫기"
                onClick={() => setIsSetupOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="sheet-content">
              {setupStep === 1 && (
                <div className="grid gap-3">
                  <div className="grid gap-2">
                    <TextInput
                      label="참석 선수 검색"
                      name="attendeeSearch"
                      type="search"
                      value={attendeeSearch}
                      onChange={(event) =>
                        setAttendeeSearch(event.target.value)
                      }
                      placeholder="이름으로 찾기"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <label className="flex min-h-10 cursor-pointer items-center gap-2 text-sm font-bold text-brand-800">
                      <input
                        type="checkbox"
                        checked={
                          players.length > 0 &&
                          selectedPlayers.length === players.length
                        }
                        onChange={toggleAllAttendance}
                        className="size-5 accent-brand-700"
                      />
                      전체 참석
                    </label>
                    <span className="text-xs font-semibold text-ink-muted">
                      전체 {players.length}명 · 참석 {selectedPlayers.length}명
                    </span>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="min-h-10 rounded-xl bg-brand-50 px-3 text-sm font-bold text-brand-800"
                      onClick={() => {
                        setPlayerFormSource('attendees');
                        setNewPlayerType('guest');
                        setIsAddingPlayer(true);
                      }}
                    >
                      + 용병 추가
                    </button>
                  </div>
                  {players.length === 0 ? (
                    <div className="rounded-2xl bg-surface-subtle p-5 text-center">
                      <p className="text-sm font-bold">
                        등록된 선수가 없습니다.
                      </p>
                      <button
                        type="button"
                        className="mt-2 text-sm font-bold text-brand-700 underline"
                        onClick={() => {
                          setIsSetupOpen(false);
                          setPlayerFormSource('attendees');
                          setNewPlayerType('guest');
                          setIsAddingPlayer(true);
                        }}
                      >
                        선수 등록하기
                      </button>
                    </div>
                  ) : (
                    <div className="attendee-list divide-y divide-line overflow-y-auto rounded-2xl border border-line">
                      {players
                        .filter(({ name }) =>
                          name
                            .toLocaleLowerCase('ko-KR')
                            .includes(
                              attendeeSearch.trim().toLocaleLowerCase('ko-KR'),
                            ),
                        )
                        .map((player) => {
                          const checked = selectedPlayerIds.includes(player.id);

                          return (
                            <div
                              key={player.id}
                              className={`flex min-h-14 items-center gap-3 px-3 py-2 ${checked ? '' : 'opacity-55'}`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                aria-label={`${player.name} 참석 여부`}
                                onChange={() => toggleAttendance(player.id)}
                                className="size-5 accent-brand-700"
                              />
                              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-100 text-sm font-extrabold text-brand-800">
                                {player.name.slice(0, 1)}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-bold">
                                  {player.name}
                                  <span className="ml-1 font-medium text-ink-faint">
                                    {player.birthYear}년생 · 만{' '}
                                    {getPlayerAge(player.birthYear)}세
                                  </span>
                                </span>
                                <span className="block truncate text-xs text-ink-muted">
                                  {player.preferredPositions.join(' · ')}
                                </span>
                              </span>
                              <PlayerTypeBadge type={player.type} />
                              <button
                                type="button"
                                className="min-h-9 rounded-lg px-2 text-xs font-bold text-brand-700 hover:bg-brand-50"
                                aria-label={`${player.name} 선수 정보 수정`}
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  editPlayer(player);
                                }}
                              >
                                수정
                              </button>
                            </div>
                          );
                        })}
                      {players.every(
                        ({ name }) =>
                          !name
                            .toLocaleLowerCase('ko-KR')
                            .includes(
                              attendeeSearch.trim().toLocaleLowerCase('ko-KR'),
                            ),
                      ) && (
                        <p className="px-3 py-6 text-center text-sm text-ink-muted">
                          검색 결과가 없습니다.
                        </p>
                      )}
                    </div>
                  )}
                  {isSampleData && players.length > 0 && (
                    <p className="text-xs text-ink-faint">
                      예시 선수 명단입니다. 필요한 선수를 수정하거나 오늘
                      참석자에서 제외할 수 있어요.
                    </p>
                  )}
                </div>
              )}

              {setupStep === 2 && (
                <div className="grid gap-3">
                  <p className="text-sm font-bold text-ink-muted">
                    오늘 경기 형태를 선택하세요.
                  </p>
                  {lineupCreationMode === 'manual' && (
                    <p className="rounded-xl bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-800">
                      직접 짜기를 선택했습니다. 설정 후 보드 아래 선수 이름을
                      눌러 배치하고, 보드 위에서 드래그해 위치를 조정하세요.
                    </p>
                  )}
                  {(
                    [
                      ['scrimmage', '자체전', '참석자를 두 팀으로 나눠 진행'],
                      ['match', '매치전', '우리 팀 한 팀의 포지션을 구성'],
                    ] as const
                  ).map(([mode, title, description]) => (
                    <button
                      key={mode}
                      type="button"
                      aria-pressed={matchMode === mode}
                      onClick={() => setMatchMode(mode)}
                      className={`rounded-2xl border p-4 text-left ${matchMode === mode ? 'border-brand-700 bg-brand-50 ring-1 ring-brand-700' : 'border-line bg-surface'}`}
                    >
                      <span className="block text-base font-extrabold">
                        {title}
                      </span>
                      <span className="mt-1 block text-sm text-ink-muted">
                        {description}
                      </span>
                    </button>
                  ))}
                  {/* {matchMode === 'scrimmage' && (
                    <p className="rounded-xl bg-accent-50 px-3 py-2 text-xs font-medium text-accent-700">
                      참석자를 회원/용병 순서로 섞어 두 팀에 번갈아 배정하고,
                      팀별 전술 보드를 따로 구성합니다.
                    </p>
                  )} */}
                </div>
              )}

              {setupStep === 3 && (
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-3">
                    <TextInput
                      label="총 쿼터 수"
                      name="quarterCount"
                      type="number"
                      min={1}
                      max={12}
                      step={1}
                      value={quarterCountInput}
                      onChange={(event) =>
                        updateQuarterCount(event.target.value)
                      }
                      onBlur={() => {
                        const count = Number(quarterCountInput);
                        if (
                          !Number.isInteger(count) ||
                          count < 1 ||
                          count > 12
                        ) {
                          setQuarterCountInput(String(quarterCount));
                        }
                      }}
                      required
                    />
                    <TextInput
                      label="선수별 최소 출전"
                      name="minimumQuarters"
                      type="number"
                      min={0}
                      max={quarterCount}
                      step={1}
                      value={minimumQuartersInput}
                      onChange={(event) =>
                        updateMinimumQuarters(event.target.value)
                      }
                      onBlur={() => {
                        const count = Number(minimumQuartersInput);
                        if (
                          !Number.isInteger(count) ||
                          count < 0 ||
                          count > quarterCount
                        ) {
                          setMinimumQuartersInput(String(minimumQuarters));
                        }
                      }}
                      required
                    />
                  </div>
                  <p className="text-xs text-ink-muted">
                    {selectedPlayers.length}명 참석 · 최소 출전은 0~
                    {quarterCount}쿼터까지 설정할 수 있어요. 인원에 따라 요청한
                    횟수를 모두에게 보장하지 못할 수 있습니다.
                  </p>

                  <fieldset className="grid gap-2">
                    <legend className="text-sm font-bold">포메이션 방식</legend>
                    <div className="grid grid-cols-3 gap-2">
                      {(
                        [
                          ['same', '동일'],
                          ['different', '쿼터별'],
                          ['recommended', '추천'],
                        ] as const
                      ).map(([mode, title]) => (
                        <button
                          key={mode}
                          type="button"
                          aria-pressed={formationMode === mode}
                          onClick={() => setFormationMode(mode)}
                          className={`min-h-10 rounded-xl border px-2 text-xs font-bold ${formationMode === mode ? 'border-brand-700 bg-brand-50 text-brand-800' : 'border-line bg-surface text-ink-muted'}`}
                        >
                          {title}
                        </button>
                      ))}
                    </div>
                  </fieldset>

                  {formationMode !== 'recommended' && (
                    <label className="grid gap-1.5 text-sm font-bold">
                      {formationMode === 'same'
                        ? '모든 쿼터 포메이션'
                        : '시작 포메이션 (쿼터마다 순환)'}
                      <select
                        value={formationId}
                        onChange={(event) => setFormationId(event.target.value)}
                        className="min-h-11 rounded-xl border border-line bg-surface px-3 text-sm font-semibold outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-100"
                      >
                        {formations.map((formation) => (
                          <option key={formation.id} value={formation.id}>
                            {formation.label} · {formation.description}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  <p className="rounded-xl bg-surface-subtle px-3 py-2 text-xs text-ink-muted">
                    {selectedPlayers.length}명 참석 · {quarterCount}쿼터 ·{' '}
                    {selectedPlayers.length === 0
                      ? '참석자를 먼저 선택해 주세요.'
                      : `최소 ${minimumQuarters}쿼터를 선수당 보장하도록 배치합니다.`}
                  </p>
                </div>
              )}
            </div>

            <div className="sheet-actions flex gap-2 border-t border-line px-4 pt-3">
              {setupStep > 1 && (
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setSetupStep((setupStep - 1) as SetupStep)}
                >
                  이전
                </Button>
              )}
              {setupStep < 3 ? (
                <Button
                  className="flex-1"
                  disabled={setupStep === 1 && selectedPlayers.length === 0}
                  onClick={() => setSetupStep((setupStep + 1) as SetupStep)}
                >
                  다음
                </Button>
              ) : (
                <Button className="flex-1" onClick={generateLineups}>
                  포메이션 배치
                </Button>
              )}
            </div>
          </section>
        </div>
      )}

      {isAddingPlayer && (
        <div
          className="sheet-backdrop"
          role="presentation"
          onClick={closePlayerForm}
        >
          <section
            className="setup-sheet player-form-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="player-form-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sheet-handle" />
            <div className="flex items-center justify-between px-4 pb-3">
              <h2 id="player-form-title" className="text-lg font-extrabold">
                {editingPlayerId
                  ? '선수 정보 수정'
                  : playerFormSource === 'attendees'
                    ? '용병 추가'
                    : '선수 등록'}
              </h2>
              <button
                type="button"
                className="modal-close grid size-11 place-items-center rounded-full text-3xl text-ink-muted hover:bg-surface-subtle"
                aria-label="등록 닫기"
                onClick={closePlayerForm}
              >
                ×
              </button>
            </div>
            <form onSubmit={addPlayer} className="sheet-content grid gap-4">
              <div className="grid grid-cols-2 gap-3">
                <TextInput
                  label="이름"
                  name="playerName"
                  value={newPlayerName}
                  onChange={(event) => setNewPlayerName(event.target.value)}
                  placeholder="선수 이름"
                  autoComplete="name"
                  required
                />
                <TextInput
                  label="출생 연도"
                  name="playerAge"
                  type="number"
                  min={new Date().getFullYear() - 90}
                  max={new Date().getFullYear() - 15}
                  value={newPlayerBirthYear}
                  onChange={(event) =>
                    setNewPlayerBirthYear(event.target.value)
                  }
                  placeholder="예: 1994"
                  required
                />
              </div>
              {playerFormSource === 'attendees' && !editingPlayerId ? (
                <p className="rounded-xl bg-brand-50 px-3 py-2 text-sm font-bold text-brand-800">
                  오늘 참석 용병으로 등록됩니다.
                </p>
              ) : (
                <fieldset className="grid gap-2">
                  <legend className="text-sm font-bold">구분</legend>
                  <div className="grid grid-cols-2 rounded-xl bg-surface-subtle p-1">
                    {(['member', 'guest'] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        className={`min-h-10 rounded-lg text-sm font-bold ${newPlayerType === type ? 'bg-surface text-brand-800 shadow-sm' : 'text-ink-muted'}`}
                        aria-pressed={newPlayerType === type}
                        onClick={() => setNewPlayerType(type)}
                      >
                        {type === 'member' ? '회원' : '용병'}
                      </button>
                    ))}
                  </div>
                </fieldset>
              )}
              <fieldset className="grid gap-2">
                <legend className="text-sm font-bold">
                  선호 포지션{' '}
                  <span className="font-medium text-ink-faint">최대 6개</span>
                </legend>
                <div className="flex flex-wrap gap-2">
                  {positions.map((position) => {
                    const selected = newPlayerPositions.includes(position);
                    const disabled =
                      !selected &&
                      newPlayerPositions.length >= 6 &&
                      position !== '포지션 상관없음';

                    return (
                      <button
                        key={position}
                        type="button"
                        disabled={disabled}
                        aria-pressed={selected}
                        onClick={() => toggleNewPlayerPosition(position)}
                        className={`min-h-9 rounded-full border px-3 text-xs font-semibold ${selected ? 'border-brand-700 bg-brand-700 text-white' : 'border-line bg-surface text-ink-muted'} disabled:opacity-40`}
                      >
                        {position}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <div className="sheet-actions border-t border-line pt-3">
                <Button type="submit" className="w-full">
                  {editingPlayerId ? '수정 완료' : '선수 등록하기'}
                </Button>
              </div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}

export default App;
