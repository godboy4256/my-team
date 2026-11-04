import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { FormEvent } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { NavLink, useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  ActionIcon,
  AutoGrowTextarea,
  Button,
  SelectChevron,
  TextInput,
} from './components';
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
import {
  evaluationGroups,
  evaluationQuestions,
} from './features/stats/evaluation';
import type { PlayerEvaluation } from './features/stats/evaluation';

const STORAGE_KEY = 'my-team-lineup-v1';
const LINEUP_STORAGE_KEY = 'my-team-lineups-v7';
const SECOND_TEAM_LINEUP_STORAGE_KEY = 'my-team-lineups-team-b-v1';
const SETUP_STORAGE_KEY = 'my-team-setup-v1';
const TEAM_INFO_STORAGE_KEY = 'my-team-info-v1';
const PLAYER_EVALUATIONS_API = '/api/player-evaluations';

type TeamInfo = {
  name: string;
  homeTown: string;
  homeGround: string;
  description: string;
  foundedAt: string;
  activityTime: string;
  kfaRegistered: boolean;
  competitions: string;
  emblem: string;
  logoDataUrl: string;
};

const emptyTeamInfo: TeamInfo = {
  name: '',
  homeTown: '',
  homeGround: '',
  description: '',
  foundedAt: '',
  activityTime: '',
  kfaRegistered: false,
  competitions: '',
  emblem: '⚽',
  logoDataUrl: '',
};

function readTeamInfo(): TeamInfo {
  try {
    const value = localStorage.getItem(TEAM_INFO_STORAGE_KEY);
    if (!value) return emptyTeamInfo;
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== 'object' || parsed === null) return emptyTeamInfo;
    const info = parsed as Partial<TeamInfo>;
    return {
      name: typeof info.name === 'string' ? info.name : '',
      homeTown: typeof info.homeTown === 'string' ? info.homeTown : '',
      homeGround: typeof info.homeGround === 'string' ? info.homeGround : '',
      description: typeof info.description === 'string' ? info.description : '',
      foundedAt: typeof info.foundedAt === 'string' ? info.foundedAt : '',
      activityTime:
        typeof info.activityTime === 'string' ? info.activityTime : '',
      kfaRegistered: info.kfaRegistered === true,
      competitions:
        typeof info.competitions === 'string' ? info.competitions : '',
      emblem: typeof info.emblem === 'string' ? info.emblem : '⚽',
      logoDataUrl: typeof info.logoDataUrl === 'string' ? info.logoDataUrl : '',
    };
  } catch {
    return emptyTeamInfo;
  }
}

type StoredState = {
  players: Player[];
  selectedPlayerIds: string[];
  isSampleData: boolean;
};

type SetupStep = 1 | 2 | 3;
type MatchMode = 'scrimmage' | 'match';
type LineupCreationMode = 'auto' | 'manual';
type StoredSetup = {
  quarterCount: number;
  minimumQuarters: number;
  formationMode: FormationMode;
  formationId: string;
  matchMode: MatchMode;
  lineupCreationMode: LineupCreationMode;
  activeTeam: 'A' | 'B';
  activeQuarter: number;
  teamAPlayerIds: string[];
  teamBPlayerIds: string[];
  hasTeamAssignments: boolean;
};

const defaultSetup: StoredSetup = {
  quarterCount: 4,
  minimumQuarters: 2,
  formationMode: 'same',
  formationId: '4-3-3',
  matchMode: 'scrimmage',
  lineupCreationMode: 'auto',
  activeTeam: 'A',
  activeQuarter: 0,
  teamAPlayerIds: [],
  teamBPlayerIds: [],
  hasTeamAssignments: false,
};

function readStoredSetup(): StoredSetup {
  try {
    const value = localStorage.getItem(SETUP_STORAGE_KEY);
    if (!value) return defaultSetup;

    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== 'object' || parsed === null) return defaultSetup;
    const setup = parsed as Partial<StoredSetup>;
    const quarterCount =
      Number.isInteger(setup.quarterCount) &&
      setup.quarterCount! >= 1 &&
      setup.quarterCount! <= 12
        ? setup.quarterCount!
        : defaultSetup.quarterCount;

    return {
      quarterCount,
      minimumQuarters:
        Number.isInteger(setup.minimumQuarters) && setup.minimumQuarters! >= 0
          ? Math.min(setup.minimumQuarters!, quarterCount)
          : defaultSetup.minimumQuarters,
      formationMode:
        setup.formationMode === 'same' ||
        setup.formationMode === 'different' ||
        setup.formationMode === 'recommended'
          ? setup.formationMode
          : defaultSetup.formationMode,
      formationId:
        typeof setup.formationId === 'string' &&
        formations.some(({ id }) => id === setup.formationId)
          ? setup.formationId
          : defaultSetup.formationId,
      matchMode:
        setup.matchMode === 'scrimmage' || setup.matchMode === 'match'
          ? setup.matchMode
          : defaultSetup.matchMode,
      lineupCreationMode:
        setup.lineupCreationMode === 'manual' ||
        setup.lineupCreationMode === 'auto'
          ? setup.lineupCreationMode
          : defaultSetup.lineupCreationMode,
      activeTeam: setup.activeTeam === 'B' ? 'B' : 'A',
      activeQuarter:
        Number.isInteger(setup.activeQuarter) && setup.activeQuarter! >= 0
          ? Math.min(setup.activeQuarter!, quarterCount - 1)
          : 0,
      teamAPlayerIds: Array.isArray(setup.teamAPlayerIds)
        ? setup.teamAPlayerIds.filter(
            (id): id is string => typeof id === 'string',
          )
        : [],
      teamBPlayerIds: Array.isArray(setup.teamBPlayerIds)
        ? setup.teamBPlayerIds.filter(
            (id): id is string => typeof id === 'string',
          )
        : [],
      hasTeamAssignments:
        Array.isArray(setup.teamAPlayerIds) &&
        Array.isArray(setup.teamBPlayerIds),
    };
  } catch {
    return defaultSetup;
  }
}

function splitScrimmagePlayers(players: Player[]) {
  const orderedPlayers = [...players].sort((first, second) =>
    first.type.localeCompare(second.type),
  );
  return {
    teamA: orderedPlayers.filter((_, index) => index % 2 === 0),
    teamB: orderedPlayers.filter((_, index) => index % 2 === 1),
  };
}

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

function getMainPositionMark(position: Position | undefined) {
  if (!position) {
    return { label: '선수', icon: 'midfield', theme: 'player-mark-midfield' };
  }
  if (position === 'GK' || position === '골키퍼') {
    return {
      label: '골키퍼',
      icon: 'goalkeeper',
      theme: 'player-mark-goalkeeper',
    };
  }
  if (
    [
      '센터백',
      '사이드백',
      '왼쪽 센터백',
      '오른쪽 센터백',
      '오른쪽 사이드백',
      '왼쪽 사이드백',
    ].includes(position)
  ) {
    return { label: '수비수', icon: 'defender', theme: 'player-mark-defender' };
  }
  if (
    [
      '미드필더',
      '수비형 미드필더',
      '중앙 수비형 미드필더',
      '왼쪽 수비형 미드필더',
      '오른쪽 수비형 미드필더',
      '중앙 미드필더',
      '왼쪽 미드필더',
      '오른쪽 미드필더',
    ].includes(position)
  ) {
    return {
      label: '미드필더',
      icon: 'midfield',
      theme: 'player-mark-midfield',
    };
  }
  if (position === '포지션 상관없음') {
    return {
      label: '멀티 플레이어',
      icon: 'midfield',
      theme: 'player-mark-midfield',
    };
  }
  return { label: '공격수', icon: 'forward', theme: 'player-mark-forward' };
}

function MainPositionMark({ position }: { position: Position | undefined }) {
  const { label, icon, theme } = getMainPositionMark(position);
  return (
    <span
      className={`main-position-mark ${theme}`}
      aria-label={`메인 포지션 ${label}`}
      title={label}
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="main-position-icon"
      >
        {icon === 'goalkeeper' && (
          <>
            <path d="M7 4.5 4.5 6 3.8 11c-.2 1.4.8 2.7 2.2 2.9l2.1.3.9-3.1 1.2 1.2 1.2-1.2.9 3.1 2.1-.3c1.4-.2 2.4-1.5 2.2-2.9L16 6l-2.5-1.5-1.5 2h-3z" />
            <path d="m8.5 7 1.5 2 1.5-2" />
            <path d="M8 14.2v3.3c0 1.1.9 2 2 2h4" />
          </>
        )}
        {icon === 'defender' && (
          <>
            <path d="M12 3.2 19 6v5.1c0 4.5-2.9 7.9-7 9.7-4.1-1.8-7-5.2-7-9.7V6z" />
            <path d="m8.5 12 2.2 2.2 4.8-5" />
          </>
        )}
        {icon === 'midfield' && (
          <>
            <circle cx="12" cy="12" r="8.5" />
            <path d="M3.8 9h4.4l2.4 3-1.5 4.5M20.2 9h-4.4l-2.4 3 1.5 4.5M10.6 3.8l1.4 3.7 3.8 1.5" />
          </>
        )}
        {icon === 'forward' && (
          <>
            <path d="M4 17.5 10.5 11 14 14.5 20 8.5" />
            <path d="M13.5 8.5H20V15" />
            <path d="M4 20h16" />
          </>
        )}
      </svg>
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
    const jerseyNumber =
      typeof player.jerseyNumber === 'number' &&
      Number.isInteger(player.jerseyNumber) &&
      player.jerseyNumber >= 0 &&
      player.jerseyNumber <= 99
        ? player.jerseyNumber
        : null;
    return [
      { ...player, jerseyNumber, birthYear, preferredPositions } as Player,
    ];
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
  const { playerId } = useParams<{ playerId: string }>();
  const initialState = useMemo(readStoredState, []);
  const initialSetup = useMemo(readStoredSetup, []);
  const initialAttendees = initialState.players.filter(({ id }) =>
    initialState.selectedPlayerIds.includes(id),
  );
  const defaultScrimmageTeams = splitScrimmagePlayers(initialAttendees);
  const [players, setPlayers] = useState<Player[]>(initialState.players);
  const [playerEvaluations, setPlayerEvaluations] = useState<
    Record<string, PlayerEvaluation>
  >({});
  const [isSampleData, setIsSampleData] = useState(initialState.isSampleData);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>(
    initialState.selectedPlayerIds,
  );
  const [quarterCount, setQuarterCount] = useState(initialSetup.quarterCount);
  const [quarterCountInput, setQuarterCountInput] = useState(
    String(initialSetup.quarterCount),
  );
  const [minimumQuarters, setMinimumQuarters] = useState(
    initialSetup.minimumQuarters,
  );
  const [minimumQuartersInput, setMinimumQuartersInput] = useState(
    String(initialSetup.minimumQuarters),
  );
  const [formationMode, setFormationMode] = useState<FormationMode>(
    initialSetup.formationMode,
  );
  const [formationId, setFormationId] = useState(initialSetup.formationId);
  const [matchMode, setMatchMode] = useState<MatchMode>(initialSetup.matchMode);
  const [lineupCreationMode, setLineupCreationMode] =
    useState<LineupCreationMode>(initialSetup.lineupCreationMode);
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

    const initialPlayers =
      initialSetup.matchMode === 'scrimmage'
        ? defaultScrimmageTeams.teamA
        : initialAttendees;
    return initialPlayers.length
      ? createLineups({
          players: initialPlayers,
          quarterCount: initialSetup.quarterCount,
          mode: initialSetup.formationMode,
          formationId: initialSetup.formationId,
          minimumQuarters: initialSetup.minimumQuarters,
          isVerticalPitch: window.matchMedia('(max-width: 47.999rem)').matches,
        })
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
      return initialSetup.matchMode === 'scrimmage' &&
        defaultScrimmageTeams.teamB.length > 0
        ? createLineups({
            players: defaultScrimmageTeams.teamB,
            quarterCount: initialSetup.quarterCount,
            mode: initialSetup.formationMode,
            formationId: initialSetup.formationId,
            minimumQuarters: initialSetup.minimumQuarters,
            isVerticalPitch: window.matchMedia('(max-width: 47.999rem)')
              .matches,
          })
        : [];
    },
  );
  const [activeTeam, setActiveTeam] = useState<'A' | 'B'>(
    initialSetup.activeTeam,
  );
  const [teamAPlayerIds, setTeamAPlayerIds] = useState<string[]>(
    initialSetup.hasTeamAssignments
      ? initialSetup.teamAPlayerIds
      : defaultScrimmageTeams.teamA.map(({ id }) => id),
  );
  const [teamBPlayerIds, setTeamBPlayerIds] = useState<string[]>(
    initialSetup.hasTeamAssignments
      ? initialSetup.teamBPlayerIds
      : defaultScrimmageTeams.teamB.map(({ id }) => id),
  );
  const [activeQuarter, setActiveQuarter] = useState(
    initialSetup.activeQuarter,
  );
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [setupStep, setSetupStep] = useState<SetupStep>(1);
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);
  const [playerCreatedName, setPlayerCreatedName] = useState('');
  const [changingSlotIndex, setChangingSlotIndex] = useState<number | null>(
    null,
  );
  const [playerReplacementSearch, setPlayerReplacementSearch] = useState('');
  const [deletingPlayerId, setDeletingPlayerId] = useState<string | null>(null);
  const [playerFormSource, setPlayerFormSource] = useState<
    'menu' | 'attendees'
  >('menu');
  const [attendeeSearch, setAttendeeSearch] = useState('');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerJerseyNumber, setNewPlayerJerseyNumber] = useState('');
  const [newPlayerBirthYear, setNewPlayerBirthYear] = useState('');
  const [newPlayerPositions, setNewPlayerPositions] = useState<Position[]>([]);
  const [newSubPositionDraft, setNewSubPositionDraft] = useState('');
  const [newPlayerType, setNewPlayerType] = useState<Player['type']>('member');
  const [notice, setNotice] = useState('');
  const [teamInfo, setTeamInfo] = useState<TeamInfo>(readTeamInfo);
  const [isTeamInfoEditorOpen, setIsTeamInfoEditorOpen] = useState(false);
  const [teamInfoDraft, setTeamInfoDraft] = useState<TeamInfo>(teamInfo);
  const [playerSearch, setPlayerSearch] = useState('');
  const [playerSort, setPlayerSort] = useState<'name' | 'jersey'>('name');
  useEffect(() => {
    if (!notice) return;
    const timeoutId = window.setTimeout(() => setNotice(''), 3200);
    return () => window.clearTimeout(timeoutId);
  }, [notice]);
  const [isVerticalPitch, setIsVerticalPitch] = useState(
    () => window.matchMedia('(max-width: 47.999rem)').matches,
  );
  const pitchRef = useRef<HTMLDivElement>(null);
  const dragPlayerId = useRef<string | null>(null);
  const sheetDragStartY = useRef<number | null>(null);
  const [sheetDragOffset, setSheetDragOffset] = useState(0);
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  const [sheetDragProgress, setSheetDragProgress] = useState(0);
  const [isSheetDragging, setIsSheetDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const previousPitchOrientation = useRef(isVerticalPitch);
  const [dragPosition, setDragPosition] = useState<{
    playerId: string;
    x: number;
    y: number;
  } | null>(null);
  const isTeamManagementPage = location.pathname === '/team';
  const isTeamInfoPage = location.pathname === '/team-info';
  const isStatsPage = location.pathname === '/stats';
  const isBoardPage = location.pathname === '/';
  const isPlayerDetailPage =
    Boolean(playerId) && location.pathname.startsWith('/players/');
  const isPlayerEvaluationPage = location.pathname.endsWith('/evaluate');
  const selectedDetailPlayer = players.find(({ id }) => id === playerId);
  const editingEvaluation = playerId ? playerEvaluations[playerId] : undefined;
  const [evaluationScores, setEvaluationScores] = useState<
    Record<string, number>
  >({});

  useEffect(() => {
    if (!isTeamManagementPage && !isPlayerDetailPage) return;
    let isActive = true;
    fetch(PLAYER_EVALUATIONS_API)
      .then(async (response) => {
        if (!response.ok) throw new Error('평가 정보를 불러오지 못했습니다.');
        const payload: unknown = await response.json();
        if (!Array.isArray(payload)) return {};
        return Object.fromEntries(
          payload.flatMap((entry): [string, PlayerEvaluation][] => {
            if (
              typeof entry !== 'object' ||
              entry === null ||
              !('playerId' in entry) ||
              typeof entry.playerId !== 'string' ||
              !('scores' in entry) ||
              typeof entry.scores !== 'object' ||
              entry.scores === null
            )
              return [];
            const scores: Record<string, number> = {};
            for (const [key, score] of Object.entries(entry.scores)) {
              if (
                evaluationQuestions.some((question) => question.id === key) &&
                typeof score === 'number' &&
                Number.isInteger(score) &&
                score >= 1 &&
                score <= 5
              ) {
                scores[key] = score;
              }
            }
            return [
              [
                entry.playerId,
                {
                  playerId: entry.playerId,
                  scores,
                  updatedAt:
                    'updatedAt' in entry && typeof entry.updatedAt === 'string'
                      ? entry.updatedAt
                      : '',
                },
              ],
            ];
          }),
        );
      })
      .then((evaluations) => {
        if (isActive) setPlayerEvaluations(evaluations);
      })
      .catch(() => {
        if (isActive)
          setNotice(
            '평가 정보를 불러오지 못했습니다. API와 데이터베이스 연결을 확인해 주세요.',
          );
      });
    return () => {
      isActive = false;
    };
  }, [isPlayerDetailPage, isTeamManagementPage]);

  useEffect(() => {
    if (isPlayerEvaluationPage && editingEvaluation) {
      setEvaluationScores(editingEvaluation.scores as Record<string, number>);
    } else if (!isPlayerEvaluationPage) {
      setEvaluationScores({});
    }
  }, [editingEvaluation, isPlayerEvaluationPage]);

  useEffect(() => {
    document.title = isPlayerDetailPage
      ? `${selectedDetailPlayer?.name ?? '선수'} 상세 | MYTEAM`
      : isTeamManagementPage
        ? '팀원 관리 | MYTEAM'
        : isTeamInfoPage
          ? '팀 정보 | MYTEAM'
          : isStatsPage
            ? '팀 기록 | MYTEAM'
            : 'MYTEAM';
  }, [
    isStatsPage,
    isTeamInfoPage,
    isTeamManagementPage,
    isPlayerDetailPage,
    selectedDetailPlayer?.name,
  ]);

  function navigateTo(path: '/' | '/team-info' | '/team' | '/stats') {
    navigate(path);
  }

  function handleSheetPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    sheetDragStartY.current = event.clientY;
    setIsSheetDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleSheetPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (sheetDragStartY.current === null) return;
    const delta = event.clientY - sheetDragStartY.current;
    const progress = Math.max(-1, Math.min(1, -delta / 180));
    setSheetDragOffset(Math.max(0, delta));
    setSheetDragProgress(progress);
    event.currentTarget.parentElement?.style.setProperty(
      '--sheet-drag-progress',
      String(progress),
    );
  }

  function handleSheetPointerUp(
    event: ReactPointerEvent<HTMLDivElement>,
    close: () => void,
  ) {
    if (sheetDragStartY.current === null) return;
    const delta = event.clientY - sheetDragStartY.current;
    sheetDragStartY.current = null;
    event.currentTarget.parentElement?.style.removeProperty(
      '--sheet-drag-progress',
    );
    setIsSheetDragging(false);
    setSheetDragProgress(0);
    if (delta < -55) {
      setSheetDragOffset(0);
      setIsSheetExpanded(true);
    }
    if (delta > 105) {
      setSheetDragOffset(Math.max(120, delta));
      window.setTimeout(() => {
        setIsSheetExpanded(false);
        setSheetDragOffset(0);
        close();
      }, 180);
    } else if (delta >= -55) {
      setSheetDragOffset(0);
    }
  }

  function saveTeamInfo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      localStorage.setItem(
        TEAM_INFO_STORAGE_KEY,
        JSON.stringify(teamInfoDraft),
      );
      setTeamInfo(teamInfoDraft);
      setIsTeamInfoEditorOpen(false);
      setNotice('팀 정보를 저장했습니다.');
    } catch {
      setNotice('팀 정보를 저장하지 못했습니다. 다시 시도해 주세요.');
    }
  }

  const selectedPlayers = useMemo(
    () => players.filter(({ id }) => selectedPlayerIds.includes(id)),
    [players, selectedPlayerIds],
  );
  const activeTeamLineups = activeTeam === 'A' ? lineups : secondTeamLineups;
  const activeTeamPlayers =
    matchMode === 'scrimmage'
      ? selectedPlayers.filter(({ id }) =>
          (activeTeam === 'A' ? teamAPlayerIds : teamBPlayerIds).includes(id),
        )
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

  useEffect(() => {
    try {
      localStorage.setItem(
        SETUP_STORAGE_KEY,
        JSON.stringify({
          quarterCount,
          minimumQuarters,
          formationMode,
          formationId,
          matchMode,
          lineupCreationMode,
          activeTeam,
          activeQuarter,
          teamAPlayerIds,
          teamBPlayerIds,
          hasTeamAssignments: true,
        } satisfies StoredSetup),
      );
    } catch {
      setNotice('경기 설정을 저장하지 못했습니다.');
    }
  }, [
    activeQuarter,
    activeTeam,
    formationId,
    formationMode,
    lineupCreationMode,
    matchMode,
    minimumQuarters,
    quarterCount,
    teamAPlayerIds,
    teamBPlayerIds,
  ]);

  function toggleAttendance(playerId: string) {
    const isSelected = selectedPlayerIds.includes(playerId);
    setSelectedPlayerIds((current) =>
      current.includes(playerId)
        ? current.filter((id) => id !== playerId)
        : [...current, playerId],
    );
    if (matchMode === 'scrimmage') {
      if (isSelected) {
        setTeamAPlayerIds((current) => current.filter((id) => id !== playerId));
        setTeamBPlayerIds((current) => current.filter((id) => id !== playerId));
      } else if (teamAPlayerIds.length <= teamBPlayerIds.length) {
        setTeamAPlayerIds((current) => [...current, playerId]);
      } else {
        setTeamBPlayerIds((current) => [...current, playerId]);
      }
    }
  }

  function toggleAllAttendance() {
    if (selectedPlayers.length === players.length) {
      setSelectedPlayerIds([]);
      setTeamAPlayerIds([]);
      setTeamBPlayerIds([]);
      return;
    }

    const attendees = [...players];
    setSelectedPlayerIds(attendees.map(({ id }) => id));
    const teams = splitScrimmagePlayers(attendees);
    setTeamAPlayerIds(teams.teamA.map(({ id }) => id));
    setTeamBPlayerIds(teams.teamB.map(({ id }) => id));
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
      const teams = splitScrimmagePlayers(selectedPlayers);
      setTeamAPlayerIds(teams.teamA.map(({ id }) => id));
      setTeamBPlayerIds(teams.teamB.map(({ id }) => id));
      setLineups(createTeamLineups(teams.teamA));
      setSecondTeamLineups(createTeamLineups(teams.teamB));
      setActiveTeam('A');
    } else {
      setTeamAPlayerIds(selectedPlayers.map(({ id }) => id));
      setTeamBPlayerIds([]);
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
    const jerseyNumber = newPlayerJerseyNumber.trim()
      ? Number(newPlayerJerseyNumber)
      : null;
    const age = getPlayerAge(birthYear);

    if (!name || !Number.isInteger(birthYear) || age < 15 || age > 90) {
      setNotice('이름과 15~90세에 해당하는 출생 연도를 입력해 주세요.');
      return;
    }

    if (
      jerseyNumber !== null &&
      (!Number.isInteger(jerseyNumber) || jerseyNumber < 0 || jerseyNumber > 99)
    ) {
      setNotice('등번호는 0~99 사이 숫자로 입력해 주세요.');
      return;
    }

    if (newPlayerPositions.length === 0) {
      setNotice('선호 포지션을 하나 이상 선택해 주세요.');
      return;
    }

    const player: Player = {
      id: editingPlayerId ?? crypto.randomUUID(),
      name,
      jerseyNumber,
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
      if (shouldReplaceSampleRoster) {
        setTeamAPlayerIds([player.id]);
        setTeamBPlayerIds([]);
      } else if (matchMode === 'scrimmage') {
        if (teamAPlayerIds.length <= teamBPlayerIds.length) {
          setTeamAPlayerIds((current) => [...current, player.id]);
        } else {
          setTeamBPlayerIds((current) => [...current, player.id]);
        }
      }
    }
    setNewPlayerName('');
    setNewPlayerJerseyNumber('');
    setNewPlayerBirthYear('');
    setNewPlayerPositions([]);
    setNewSubPositionDraft('');
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
    setNewPlayerJerseyNumber(
      player.jerseyNumber == null ? '' : String(player.jerseyNumber),
    );
    setNewPlayerBirthYear(String(player.birthYear));
    setNewPlayerPositions(player.preferredPositions);
    setNewSubPositionDraft('');
    setNewPlayerType(player.type);
    setIsAddingPlayer(true);
  }

  function closePlayerForm() {
    setIsAddingPlayer(false);
    setEditingPlayerId(null);
    setNewPlayerName('');
    setNewPlayerJerseyNumber('');
    setNewPlayerBirthYear('');
    setNewPlayerPositions([]);
    setNewSubPositionDraft('');
    setNewPlayerType('member');
  }

  function deletePlayer() {
    if (!deletingPlayerId) return;
    const deletedPlayer = players.find(({ id }) => id === deletingPlayerId);
    if (!deletedPlayer) return;

    setPlayers((current) =>
      current.filter(({ id }) => id !== deletingPlayerId),
    );
    setSelectedPlayerIds((current) =>
      current.filter((id) => id !== deletingPlayerId),
    );
    setTeamAPlayerIds((current) =>
      current.filter((id) => id !== deletingPlayerId),
    );
    setTeamBPlayerIds((current) =>
      current.filter((id) => id !== deletingPlayerId),
    );
    setPlayerEvaluations((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([id]) => id !== deletingPlayerId),
      ),
    );
    void fetch(`${PLAYER_EVALUATIONS_API}/${deletingPlayerId}`, {
      method: 'DELETE',
    }).catch(() => {
      setNotice('선수 평가 기록을 서버에서 삭제하지 못했습니다.');
    });
    const clearPlayerFromLineups = (current: QuarterLineup[]) =>
      current.map((quarter) => ({
        ...quarter,
        slots: quarter.slots.map((slot) =>
          slot.playerId === deletingPlayerId
            ? { ...slot, playerId: null }
            : slot,
        ),
      }));
    setLineups(clearPlayerFromLineups);
    setSecondTeamLineups(clearPlayerFromLineups);
    setIsSampleData(false);
    setDeletingPlayerId(null);
    if (deletingPlayerId === playerId) navigate('/team');
    setNotice(`${deletedPlayer.name} 선수를 팀에서 삭제했습니다.`);
  }

  async function savePlayerEvaluation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!playerId || !selectedDetailPlayer) return;
    const answeredCount = evaluationQuestions.filter(
      ({ id }) => evaluationScores[id] !== undefined,
    ).length;
    if (answeredCount !== evaluationQuestions.length) {
      setNotice(
        `평가 항목 ${evaluationQuestions.length - answeredCount}개가 남아 있습니다.`,
      );
      return;
    }
    try {
      const response = await fetch(`${PLAYER_EVALUATIONS_API}/${playerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scores: evaluationScores }),
      });
      if (!response.ok) throw new Error('평가 저장에 실패했습니다.');
      const saved: unknown = await response.json();
      if (typeof saved !== 'object' || saved === null || !('scores' in saved)) {
        throw new Error('저장된 평가 응답이 올바르지 않습니다.');
      }
      const savedScores = saved.scores;
      if (typeof savedScores !== 'object' || savedScores === null) {
        throw new Error('저장된 평가 점수가 올바르지 않습니다.');
      }
      setPlayerEvaluations((current) => ({
        ...current,
        [playerId]: {
          playerId,
          scores: savedScores as Record<string, number>,
          updatedAt:
            'updatedAt' in saved && typeof saved.updatedAt === 'string'
              ? saved.updatedAt
              : new Date().toISOString(),
        },
      }));
      navigate(`/players/${playerId}`);
      setNotice(`${selectedDetailPlayer.name} 선수 평가를 저장했습니다.`);
    } catch {
      setNotice(
        '평가를 저장하지 못했습니다. API와 데이터베이스 연결을 확인해 주세요.',
      );
    }
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
    setPlayerReplacementSearch('');
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

  function updateMainPosition(value: string) {
    if (!value) {
      setNewPlayerPositions([]);
      return;
    }

    const nextMain = value as Position;
    if (nextMain === '포지션 상관없음') {
      setNewPlayerPositions([nextMain]);
      return;
    }

    setNewPlayerPositions((current) => {
      const currentMain = current[0];
      const secondary = current
        .slice(1)
        .filter((position) => position !== nextMain);
      if (
        currentMain &&
        currentMain !== '포지션 상관없음' &&
        currentMain !== nextMain
      ) {
        secondary.unshift(currentMain);
      }
      return [nextMain, ...secondary.slice(0, 5)];
    });
  }

  function addSecondaryPosition(value: string) {
    if (!value) return;
    const position = value as Position;
    setNewPlayerPositions((current) =>
      current.length >= 6 || current.includes(position)
        ? current
        : [...current, position],
    );
    setNewSubPositionDraft('');
  }

  function removeSecondaryPosition(position: Position) {
    setNewPlayerPositions((current) => [
      current[0]!,
      ...current.slice(1).filter((item) => item !== position),
    ]);
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
        <section className="team-management-page styled-scrollbar">
          <div className="team-page-content">
            <div>
              <h1 className="text-xl font-black">팀 관리</h1>
              <p className="mt-1 text-sm text-ink-muted">
                선수 정보를 보고 평가표를 작성할 수 있어요.
              </p>
            </div>
            <div className="flex items-end gap-1.5">
              <TextInput
                label="선수 검색"
                name="teamPlayerSearch"
                type="search"
                className="min-w-0"
                value={playerSearch}
                onChange={(event) => setPlayerSearch(event.target.value)}
                placeholder="이름, 등번호, 포지션 검색"
              />
              <label className="sort-select-control">
                <span className="sr-only">선수 정렬</span>
                <select
                  aria-label="선수 목록 정렬"
                  value={playerSort}
                  onChange={(event) =>
                    setPlayerSort(event.target.value as 'name' | 'jersey')
                  }
                  className="sort-select"
                >
                  <option value="name">이름순</option>
                  <option value="jersey">등번호순</option>
                </select>
                <SelectChevron />
              </label>
            </div>
            {players.filter((player) => {
              const query = playerSearch.trim().toLocaleLowerCase('ko-KR');
              return [
                player.name,
                player.jerseyNumber == null ? '' : String(player.jerseyNumber),
                ...player.preferredPositions,
              ].some((value) =>
                value.toLocaleLowerCase('ko-KR').includes(query),
              );
            }).length === 0 ? (
              <p className="rounded-2xl bg-surface-subtle p-5 text-center text-sm text-ink-muted">
                {players.length === 0
                  ? '등록된 팀원이 없습니다.'
                  : '검색 결과가 없습니다.'}
              </p>
            ) : (
              <div className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
                {players
                  .filter((player) => {
                    const query = playerSearch
                      .trim()
                      .toLocaleLowerCase('ko-KR');
                    return [
                      player.name,
                      player.jerseyNumber == null
                        ? ''
                        : String(player.jerseyNumber),
                      ...player.preferredPositions,
                    ].some((value) =>
                      value.toLocaleLowerCase('ko-KR').includes(query),
                    );
                  })
                  .sort((first, second) =>
                    playerSort === 'jersey'
                      ? (first.jerseyNumber ?? Number.MAX_SAFE_INTEGER) -
                        (second.jerseyNumber ?? Number.MAX_SAFE_INTEGER)
                      : first.name.localeCompare(second.name, 'ko-KR'),
                  )
                  .map((player) => (
                    <div
                      key={player.id}
                      className="team-player-row flex min-h-16 items-center gap-3 px-4 py-3"
                      role="link"
                      tabIndex={0}
                      aria-label={`${player.name} 선수 자세히 보기`}
                      onClick={() => navigate(`/players/${player.id}`)}
                      onKeyDown={(event) => {
                        if (
                          event.target === event.currentTarget &&
                          (event.key === 'Enter' || event.key === ' ')
                        ) {
                          event.preventDefault();
                          navigate(`/players/${player.id}`);
                        }
                      }}
                    >
                      <MainPositionMark
                        position={player.preferredPositions[0]}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-bold">
                          {player.jerseyNumber != null && (
                            <span className="mr-1.5 text-brand-700">
                              #{player.jerseyNumber}
                            </span>
                          )}
                          {player.name}
                          <span className="ml-2 text-xs font-medium text-ink-faint">
                            {player.birthYear}년생 · 만{' '}
                            {getPlayerAge(player.birthYear)}세
                          </span>
                        </span>
                        <span className="flex min-w-0 items-center gap-2">
                          <PlayerTypeBadge type={player.type} />
                          <span className="min-w-0 flex-1 truncate text-xs text-ink-muted">
                            {player.preferredPositions.join(' · ')}
                          </span>
                        </span>
                      </span>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          className="action-icon-button text-ink-muted hover:bg-surface-subtle"
                          aria-label={`${player.name} 선수 자세히 보기`}
                          onClick={(event) => {
                            event.stopPropagation();
                            navigate(`/players/${player.id}`);
                          }}
                        >
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            className="size-4"
                          >
                            <circle cx="12" cy="12" r="9" />
                            <path d="M12 11v5m0-8h.01" strokeLinecap="round" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="action-icon-button text-brand-700 hover:bg-brand-50"
                          aria-label={`${player.name} 선수 수정`}
                          onClick={(event) => {
                            event.stopPropagation();
                            editPlayer(player);
                          }}
                        >
                          <ActionIcon name="edit" className="size-4" />
                        </button>
                        <button
                          type="button"
                          className="action-icon-button text-danger hover:bg-red-50"
                          aria-label={`${player.name} 선수 삭제`}
                          onClick={(event) => {
                            event.stopPropagation();
                            setDeletingPlayerId(player.id);
                          }}
                        >
                          <ActionIcon name="trash" className="size-4" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </section>
      )}

      {isPlayerDetailPage &&
        selectedDetailPlayer &&
        !isPlayerEvaluationPage && (
          <section className="team-management-page styled-scrollbar">
            <div className="team-page-content player-detail-content">
              <button
                type="button"
                className="text-left text-sm font-bold text-ink-muted"
                onClick={() => navigate('/team')}
              >
                ← 팀 관리
              </button>
              <article className="player-profile-card">
                <div className="player-profile-topline">
                  <span
                    className="player-profile-avatar"
                    aria-label={`${selectedDetailPlayer.name} 프로필 이미지 자리`}
                  >
                    {selectedDetailPlayer.name.slice(0, 1)}
                  </span>
                  <div className="min-w-0 flex-1">
                    {selectedDetailPlayer.jerseyNumber != null && (
                      <span className="player-profile-number">
                        #{selectedDetailPlayer.jerseyNumber}
                      </span>
                    )}
                    <h1 className="player-profile-name">
                      {selectedDetailPlayer.name}
                    </h1>
                  </div>
                  <MainPositionMark
                    position={selectedDetailPlayer.preferredPositions[0]}
                  />
                </div>
                <div className="player-profile-meta">
                  <span>{selectedDetailPlayer.birthYear}년생</span>
                  <span>
                    만 {getPlayerAge(selectedDetailPlayer.birthYear)}세
                  </span>
                  <PlayerTypeBadge type={selectedDetailPlayer.type} />
                  <span className="player-main-position">
                    메인 포지션{' '}
                    <strong>
                      {selectedDetailPlayer.preferredPositions[0] ?? '미등록'}
                    </strong>
                  </span>
                </div>
                {selectedDetailPlayer.preferredPositions.length > 1 && (
                  <div className="player-secondary-positions">
                    <span>서브 포지션</span>
                    {selectedDetailPlayer.preferredPositions
                      .slice(1)
                      .map((position) => (
                        <span key={position} className="position-chip">
                          {position}
                        </span>
                      ))}
                  </div>
                )}
                <div className="player-profile-actions">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => editPlayer(selectedDetailPlayer)}
                  >
                    <ActionIcon name="edit" className="size-4" />
                    정보 수정
                  </Button>
                  <Button
                    variant="quiet"
                    size="sm"
                    className="text-danger hover:bg-red-50"
                    onClick={() => setDeletingPlayerId(selectedDetailPlayer.id)}
                  >
                    <ActionIcon name="trash" className="size-4" />
                    선수 삭제
                  </Button>
                </div>
              </article>
              {editingEvaluation ? (
                <section className="player-evaluation-summary">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-extrabold">선수 평가</h2>
                      <p className="text-sm text-ink-muted">
                        항목별 평가 점수와 영역 평균
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => navigate(`/players/${playerId}/evaluate`)}
                    >
                      평가 수정
                    </Button>
                  </div>
                  {evaluationGroups.map((group) => {
                    const questions = evaluationQuestions.filter(
                      (question) => question.group === group,
                    );
                    const scores = questions.flatMap(
                      ({ id }) => editingEvaluation.scores[id] ?? [],
                    );
                    const average = scores.length
                      ? (
                          scores.reduce((sum, score) => sum + score, 0) /
                          scores.length
                        ).toFixed(1)
                      : '—';
                    return (
                      <div key={group} className="evaluation-group-summary">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold">{group}</h3>
                          <span className="font-extrabold text-brand-800">
                            {average}
                            <span className="text-xs font-medium text-ink-muted">
                              {' '}
                              / 5
                            </span>
                          </span>
                        </div>
                        <dl className="mt-2 divide-y divide-line">
                          {questions.map((question) => (
                            <div
                              key={question.id}
                              className="flex items-center justify-between gap-3 py-2 text-sm"
                            >
                              <dt className="text-ink-muted">
                                {question.label}
                              </dt>
                              <dd className="font-bold">
                                {editingEvaluation.scores[question.id] ?? '—'}점
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    );
                  })}
                </section>
              ) : (
                <section className="player-evaluation-empty">
                  <span
                    className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-2xl text-brand-700"
                    aria-hidden="true"
                  >
                    ☆
                  </span>
                  <h2 className="mt-3 text-lg font-extrabold">
                    아직 선수 평가가 필요해요
                  </h2>
                  <p className="mt-1 text-sm text-ink-muted">
                    15개 항목의 문항을 선택해 {selectedDetailPlayer.name} 선수의
                    스탯을 기록해 보세요.
                  </p>
                  <Button
                    className="mt-5"
                    onClick={() => navigate(`/players/${playerId}/evaluate`)}
                  >
                    선수 평가하기
                  </Button>
                </section>
              )}
            </div>
          </section>
        )}

      {isPlayerEvaluationPage && selectedDetailPlayer && (
        <section className="team-management-page styled-scrollbar">
          <div className="team-page-content evaluation-form-content">
            <button
              type="button"
              className="text-left text-sm font-bold text-ink-muted"
              onClick={() => navigate(`/players/${playerId}`)}
            >
              ← 선수 상세
            </button>
            <div>
              <h1 className="text-xl font-black">
                {selectedDetailPlayer.name} 선수 평가
              </h1>
              <p className="mt-1 text-sm text-ink-muted">
                가장 잘 맞는 설명을 항목마다 하나씩 선택해 주세요.
              </p>
            </div>
            <div className="evaluation-progress" role="status">
              {Object.keys(evaluationScores).length} /{' '}
              {evaluationQuestions.length} 항목 선택
            </div>
            <form
              id="player-evaluation-form"
              onSubmit={savePlayerEvaluation}
              className="grid gap-5"
            >
              {evaluationGroups.map((group) => (
                <section key={group} className="evaluation-form-group">
                  <h2 className="mb-3 text-lg font-extrabold">{group}</h2>
                  {evaluationQuestions
                    .filter((question) => question.group === group)
                    .map((question) => (
                      <fieldset
                        key={question.id}
                        className="evaluation-question"
                      >
                        <legend className="font-bold">{question.label}</legend>
                        <p className="mt-1 text-sm text-ink-muted">
                          {question.prompt}
                        </p>
                        <div className="mt-3 grid gap-2">
                          {question.options.map((option, optionIndex) => {
                            const score = 5 - optionIndex;
                            return (
                              <label
                                key={option}
                                className={`evaluation-option ${evaluationScores[question.id] === score ? 'is-selected' : ''}`}
                              >
                                <input
                                  type="radio"
                                  name={question.id}
                                  value={score}
                                  checked={
                                    evaluationScores[question.id] === score
                                  }
                                  onChange={() =>
                                    setEvaluationScores((current) => ({
                                      ...current,
                                      [question.id]: score,
                                    }))
                                  }
                                  required
                                />
                                <span className="evaluation-score">
                                  {score}
                                </span>
                                <span>{option}</span>
                              </label>
                            );
                          })}
                        </div>
                      </fieldset>
                    ))}
                </section>
              ))}
            </form>
          </div>
        </section>
      )}

      {isPlayerEvaluationPage &&
        selectedDetailPlayer &&
        createPortal(
          <div className="evaluation-submit-bar">
            <Button
              type="submit"
              form="player-evaluation-form"
              className="w-full"
            >
              평가 저장하기
            </Button>
          </div>,
          document.body,
        )}

      {isTeamInfoPage && (
        <section className="team-management-page styled-scrollbar">
          <div className="team-page-content team-info-content">
            <section className="team-home-overview">
              <div>
                <p className="text-sm font-semibold text-ink-muted">팀 홈</p>
                <h1 className="mt-1 text-xl font-black">우리 팀 한눈에 보기</h1>
              </div>
              <div className="team-home-count">
                <strong>{players.length}</strong>
                <span>등록 선수</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => navigate('/team')}>
                  선수·평가표 보기
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => navigate('/')}
                >
                  전술보드 열기
                </Button>
              </div>
            </section>
            <div className="team-info-heading">
              <span className="team-info-emblem" aria-hidden="true">
                {teamInfo.logoDataUrl ? (
                  <img
                    src={teamInfo.logoDataUrl}
                    alt="팀 로고"
                    className="size-full object-cover"
                  />
                ) : (
                  teamInfo.emblem
                )}
              </span>
              <button
                type="button"
                className="action-icon-button ml-auto text-brand-700 hover:bg-brand-50"
                aria-label="팀 정보 수정"
                onClick={() => {
                  setTeamInfoDraft(teamInfo);
                  setIsTeamInfoEditorOpen(true);
                }}
              >
                <ActionIcon name="edit" className="size-5" />
              </button>
            </div>
            <article className="team-info-preview">
              <h2 className="text-xl font-black">
                {teamInfo.name || '팀 이름을 등록해 주세요'}
              </h2>
              <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <p>
                  <strong>활동 지역</strong>
                  <span className="ml-2 text-ink-muted">
                    {teamInfo.homeTown || '미등록'}
                  </span>
                </p>
                <p>
                  <strong>주 경기장</strong>
                  <span className="ml-2 text-ink-muted">
                    {teamInfo.homeGround || '미등록'}
                  </span>
                </p>
                <p>
                  <strong>창단일</strong>
                  <span className="ml-2 text-ink-muted">
                    {teamInfo.foundedAt || '미등록'}
                  </span>
                </p>
                <p>
                  <strong>활동 시간</strong>
                  <span className="ml-2 text-ink-muted">
                    {teamInfo.activityTime || '미등록'}
                  </span>
                </p>
                <p>
                  <strong>KFA 등록</strong>
                  <span className="ml-2 text-ink-muted">
                    {teamInfo.kfaRegistered ? '등록' : '미등록'}
                  </span>
                </p>
                <p>
                  <strong>총 인원</strong>
                  <span className="ml-2 text-ink-muted">
                    {players.length}명
                  </span>
                </p>
                <p className="sm:col-span-2">
                  <strong>주요 참가 대회</strong>
                  <span className="ml-2 text-ink-muted">
                    {teamInfo.competitions || '미등록'}
                  </span>
                </p>
              </div>
              {teamInfo.description && (
                <p className="mt-4 whitespace-pre-wrap border-t border-line pt-4 text-sm text-ink-muted">
                  {teamInfo.description}
                </p>
              )}
            </article>
          </div>
        </section>
      )}
      {isTeamInfoEditorOpen && (
        <div
          className="sheet-backdrop modal-backdrop"
          role="presentation"
          onClick={() => setIsTeamInfoEditorOpen(false)}
        >
          <section
            className="confirm-dialog motion-dialog team-info-editor"
            role="dialog"
            aria-modal="true"
            aria-labelledby="team-info-editor-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="team-info-editor-title" className="text-lg font-extrabold">
              팀 정보 수정
            </h2>
            <form className="team-info-form mt-4" onSubmit={saveTeamInfo}>
              <TextInput
                label="팀 이름"
                name="teamName"
                value={teamInfoDraft.name}
                onChange={(event) =>
                  setTeamInfoDraft((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="예: 마이팀 FC"
                required
              />
              <TextInput
                label="활동 지역"
                name="homeTown"
                value={teamInfoDraft.homeTown}
                onChange={(event) =>
                  setTeamInfoDraft((current) => ({
                    ...current,
                    homeTown: event.target.value,
                  }))
                }
                placeholder="예: 서울시 마포구"
              />
              <TextInput
                label="주 경기장"
                name="homeGround"
                value={teamInfoDraft.homeGround}
                onChange={(event) =>
                  setTeamInfoDraft((current) => ({
                    ...current,
                    homeGround: event.target.value,
                  }))
                }
                placeholder="예: 월드컵 보조경기장"
              />
              <label className="grid gap-1.5 text-sm font-semibold">
                창단일
                <input
                  type="date"
                  value={teamInfoDraft.foundedAt}
                  onChange={(event) =>
                    setTeamInfoDraft((current) => ({
                      ...current,
                      foundedAt: event.target.value,
                    }))
                  }
                  className="h-12 rounded-xl border border-line bg-surface px-3 outline-none transition-colors focus:border-brand-600 focus:ring-4 focus:ring-brand-100"
                />
              </label>
              <TextInput
                label="활동 시간"
                name="activityTime"
                value={teamInfoDraft.activityTime}
                onChange={(event) =>
                  setTeamInfoDraft((current) => ({
                    ...current,
                    activityTime: event.target.value,
                  }))
                }
                placeholder="예: 매주 일요일 오전 8시"
              />
              <label className="grid gap-1.5 text-sm font-semibold">
                주요 참가 대회
                <input
                  value={teamInfoDraft.competitions}
                  onChange={(event) =>
                    setTeamInfoDraft((current) => ({
                      ...current,
                      competitions: event.target.value,
                    }))
                  }
                  placeholder="예: 마포구 생활체육 축구대회"
                  className="h-12 rounded-xl border border-line bg-surface px-3 outline-none transition-colors focus:border-brand-600 focus:ring-4 focus:ring-brand-100"
                />
              </label>
              <label className="flex min-h-10 items-center gap-2 text-sm font-semibold">
                <input
                  type="checkbox"
                  checked={teamInfoDraft.kfaRegistered}
                  onChange={(event) =>
                    setTeamInfoDraft((current) => ({
                      ...current,
                      kfaRegistered: event.target.checked,
                    }))
                  }
                />
                KFA 팀 등록
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                팀 로고
                <span className="flex flex-wrap gap-2">
                  {['⚽', '🛡️', '🦅', '🐯', '⭐'].map((emblem) => (
                    <button
                      key={emblem}
                      type="button"
                      aria-label={`${emblem} 로고 선택`}
                      aria-pressed={
                        teamInfoDraft.emblem === emblem &&
                        !teamInfoDraft.logoDataUrl
                      }
                      onClick={() =>
                        setTeamInfoDraft((current) => ({
                          ...current,
                          emblem,
                          logoDataUrl: '',
                        }))
                      }
                      className={`grid size-11 place-items-center rounded-xl border text-xl ${teamInfoDraft.emblem === emblem && !teamInfoDraft.logoDataUrl ? 'border-brand-600 bg-brand-50' : 'border-line'}`}
                    >
                      {emblem}
                    </button>
                  ))}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      if (typeof reader.result === 'string')
                        setTeamInfoDraft((current) => ({
                          ...current,
                          logoDataUrl: reader.result as string,
                        }));
                    };
                    reader.readAsDataURL(file);
                  }}
                  className="text-sm"
                />
                <span className="text-xs font-normal text-ink-muted">
                  이미지는 이 브라우저에만 저장됩니다.
                </span>
              </label>
              <label className="grid gap-1.5 text-sm font-semibold">
                팀 소개
                <AutoGrowTextarea
                  value={teamInfoDraft.description}
                  onChange={(event) =>
                    setTeamInfoDraft((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="팀에 대해 간단히 소개해 주세요."
                />
              </label>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  onClick={() => setIsTeamInfoEditorOpen(false)}
                >
                  취소
                </Button>
                <Button type="submit">저장</Button>
              </div>
            </form>
          </section>
        </div>
      )}
      {isStatsPage && (
        <section className="team-management-page" aria-label="팀 기록">
          <div className="team-page-content">
            <div className="player-evaluation-empty">
              <h1 className="text-xl font-black">팀 기록</h1>
              <p className="mt-2 text-sm text-ink-muted">
                경기별 기록 기능은 준비 중입니다.
              </p>
            </div>
          </div>
        </section>
      )}

      {deletingPlayerId && (
        <div
          className="sheet-backdrop modal-backdrop"
          role="presentation"
          onClick={() => setDeletingPlayerId(null)}
        >
          <section
            className="confirm-dialog motion-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-player-title"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id="delete-player-title" className="text-lg font-extrabold">
              팀원을 삭제할까요?
            </h2>
            <p className="mt-2 text-sm text-ink-muted">
              {players.find(({ id }) => id === deletingPlayerId)?.name} 선수를
              팀 명단과 라인업에서 삭제합니다.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                onClick={() => setDeletingPlayerId(null)}
              >
                취소
              </Button>
              <Button
                className="bg-danger hover:bg-danger"
                onClick={deletePlayer}
              >
                삭제
              </Button>
            </div>
          </section>
        </div>
      )}
      <nav className="bottom-navigation" aria-label="주요 메뉴">
        {(
          [
            { to: '/team-info', label: '홈', icon: '⌂' },
            { to: '/', label: '전술보드', icon: '⚽' },
            { to: '/team', label: '팀 관리', icon: '♙' },
            { to: '/stats', label: '팀 기록', icon: '▤' },
          ] as const
        ).map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `bottom-navigation-item ${isActive ? 'is-active' : ''}`
            }
          >
            <span className="bottom-navigation-icon" aria-hidden="true">
              {icon}
            </span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {isTeamManagementPage && (
        <button
          type="button"
          className="player-add-fab"
          aria-label="선수 추가"
          onClick={() => {
            setPlayerFormSource('menu');
            setNewPlayerType('member');
            setIsAddingPlayer(true);
          }}
        >
          <span aria-hidden="true">+</span>
        </button>
      )}

      {isBoardPage && playerCreatedName && (
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

      {isBoardPage && changingSlotIndex !== null && activeLineup && (
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
            <TextInput
              label="선수 검색"
              name="playerReplacementSearch"
              type="search"
              value={playerReplacementSearch}
              onChange={(event) =>
                setPlayerReplacementSearch(event.target.value)
              }
              placeholder="이름으로 찾기"
            />
            <div className="modal-scroll-region styled-scrollbar mt-2 grid max-h-64 gap-1 overflow-y-auto">
              {activeTeamPlayers
                .filter(
                  ({ id }) =>
                    !activeLineup.slots.some(
                      (slot, index) =>
                        index !== changingSlotIndex && slot.playerId === id,
                    ),
                )
                .filter(({ name }) =>
                  name
                    .toLocaleLowerCase('ko-KR')
                    .includes(
                      playerReplacementSearch.trim().toLocaleLowerCase('ko-KR'),
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
              {activeTeamPlayers.filter(
                ({ name, id }) =>
                  name
                    .toLocaleLowerCase('ko-KR')
                    .includes(
                      playerReplacementSearch.trim().toLocaleLowerCase('ko-KR'),
                    ) &&
                  !activeLineup.slots.some(
                    (slot, index) =>
                      index !== changingSlotIndex && slot.playerId === id,
                  ),
              ).length === 0 && (
                <p className="py-5 text-center text-sm text-ink-muted">
                  교체할 선수가 없습니다.
                </p>
              )}
            </div>
          </section>
        </div>
      )}

      {isBoardPage && (
        <>
          <section className="board-area" aria-label="전술 보드">
            {activeLineup && (
              <div className="board-meta flex items-center justify-between px-3 py-2 text-xs font-bold text-ink-muted">
                <span>
                  {activeQuarter + 1}쿼터 · {detectedFormationLabel}
                </span>
                <span>{activeTeamPlayers.length}명 참석</span>
              </div>
            )}

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
                          setPlayerReplacementSearch('');
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
              aria-label="전술판 초기화"
            >
              전술판 초기화
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
            className={`setup-sheet ${isSheetExpanded ? 'sheet-expanded' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="setup-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className="sheet-handle"
              role="button"
              tabIndex={0}
              aria-label="위로 끌어올려 모달 확장, 아래로 끌어내려 닫기"
              style={{
                transform: `translateY(${sheetDragOffset}px) scaleX(${1 + Math.max(0, sheetDragProgress) * 0.22})`,
              }}
              data-drag-progress={sheetDragProgress}
              data-dragging={isSheetDragging}
              onPointerDown={handleSheetPointerDown}
              onPointerMove={handleSheetPointerMove}
              onPointerUp={(event) =>
                handleSheetPointerUp(event, () => setIsSetupOpen(false))
              }
              onPointerCancel={(event) => {
                sheetDragStartY.current = null;
                event.currentTarget.parentElement?.style.removeProperty(
                  '--sheet-drag-progress',
                );
                setSheetDragOffset(0);
                setSheetDragProgress(0);
                setIsSheetDragging(false);
              }}
            />
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

            <div className="sheet-content styled-scrollbar">
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
                    <div className="attendee-list styled-scrollbar divide-y divide-line overflow-y-auto rounded-2xl border border-line">
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
                                className="action-icon-button text-brand-700 hover:bg-brand-50"
                                aria-label={`${player.name} 선수 정보 수정`}
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                  editPlayer(player);
                                }}
                              >
                                <ActionIcon name="edit" className="size-4" />
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
                      <span className="select-control">
                        <select
                          value={formationId}
                          onChange={(event) =>
                            setFormationId(event.target.value)
                          }
                          className="h-12 w-full rounded-xl border border-line bg-surface pl-3 pr-11 text-sm font-semibold outline-none transition-colors focus:border-brand-600 focus:ring-4 focus:ring-brand-100"
                        >
                          {formations.map((formation) => (
                            <option key={formation.id} value={formation.id}>
                              {formation.label} · {formation.description}
                            </option>
                          ))}
                        </select>
                        <SelectChevron />
                      </span>
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
            className={`setup-sheet player-form-sheet ${isSheetExpanded ? 'sheet-expanded' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="player-form-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className="sheet-handle"
              role="button"
              tabIndex={0}
              aria-label="위로 끌어올려 모달 확장, 아래로 끌어내려 닫기"
              style={{
                transform: `translateY(${sheetDragOffset}px) scaleX(${1 + Math.max(0, sheetDragProgress) * 0.22})`,
              }}
              data-drag-progress={sheetDragProgress}
              data-dragging={isSheetDragging}
              onPointerDown={handleSheetPointerDown}
              onPointerMove={handleSheetPointerMove}
              onPointerUp={(event) =>
                handleSheetPointerUp(event, closePlayerForm)
              }
              onPointerCancel={(event) => {
                sheetDragStartY.current = null;
                event.currentTarget.parentElement?.style.removeProperty(
                  '--sheet-drag-progress',
                );
                setSheetDragOffset(0);
                setSheetDragProgress(0);
                setIsSheetDragging(false);
              }}
            />
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
            <form
              onSubmit={addPlayer}
              className="sheet-content styled-scrollbar grid gap-4"
            >
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
              <TextInput
                label="등번호 (선택)"
                name="playerJerseyNumber"
                type="number"
                min={0}
                max={99}
                value={newPlayerJerseyNumber}
                onChange={(event) =>
                  setNewPlayerJerseyNumber(event.target.value)
                }
                placeholder="예: 10"
              />
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
              <div className="grid gap-3">
                <label className="grid gap-1.5 text-sm font-semibold">
                  메인 포지션
                  <span className="select-control">
                    <select
                      value={newPlayerPositions[0] ?? ''}
                      onChange={(event) =>
                        updateMainPosition(event.target.value)
                      }
                      className="h-12 w-full rounded-xl border border-line bg-surface pl-4 pr-11 outline-none transition-colors focus:border-brand-600 focus:ring-4 focus:ring-brand-100"
                      required
                    >
                      <option value="">메인 포지션 선택</option>
                      {positions.map((position) => (
                        <option key={position} value={position}>
                          {position}
                        </option>
                      ))}
                    </select>
                    <SelectChevron />
                  </span>
                </label>
                <label className="grid gap-1.5 text-sm font-semibold">
                  서브 포지션{' '}
                  <span className="font-normal text-ink-faint">
                    {Math.max(0, newPlayerPositions.length - 1)} / 5개 선택
                  </span>
                  <span className="select-control">
                    <select
                      value={newSubPositionDraft}
                      onChange={(event) =>
                        addSecondaryPosition(event.target.value)
                      }
                      disabled={
                        !newPlayerPositions[0] ||
                        newPlayerPositions[0] === '포지션 상관없음' ||
                        newPlayerPositions.length >= 6
                      }
                      className="h-12 w-full rounded-xl border border-line bg-surface pl-4 pr-11 outline-none transition-colors focus:border-brand-600 focus:ring-4 focus:ring-brand-100 disabled:bg-surface-subtle disabled:text-ink-faint"
                    >
                      <option value="">서브 포지션 추가</option>
                      {positions
                        .filter((position) => position !== '포지션 상관없음')
                        .map((position) => (
                          <option
                            key={position}
                            value={position}
                            disabled={newPlayerPositions.includes(position)}
                          >
                            {position}
                          </option>
                        ))}
                    </select>
                    <SelectChevron />
                  </span>
                </label>
                {newPlayerPositions.length > 1 && (
                  <div className="flex flex-wrap gap-2">
                    {newPlayerPositions.slice(1).map((position) => (
                      <span
                        key={position}
                        className="inline-flex min-h-8 items-center gap-1 rounded-full bg-brand-50 px-3 text-xs font-semibold text-brand-800"
                      >
                        {position}
                        <button
                          type="button"
                          className="grid size-5 place-items-center rounded-full text-base leading-none hover:bg-brand-100"
                          aria-label={`${position} 서브 포지션 삭제`}
                          onClick={() => removeSecondaryPosition(position)}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
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
