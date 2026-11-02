import { useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { Button, TextInput } from './components';
import {
  createLineups,
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
        const savedPlayers = parsed.players as Player[];
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
    players: demoPlayers,
    selectedPlayerIds: demoPlayers.map(({ id }) => id),
    isSampleData: true,
  };
}

function App() {
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
  const [activeQuarter, setActiveQuarter] = useState(0);
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [setupStep, setSetupStep] = useState<SetupStep>(1);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);
  const [playerFormSource, setPlayerFormSource] = useState<
    'menu' | 'attendees'
  >('menu');
  const [attendeeSearch, setAttendeeSearch] = useState('');
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerAge, setNewPlayerAge] = useState('');
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

  const selectedPlayers = useMemo(
    () => players.filter(({ id }) => selectedPlayerIds.includes(id)),
    [players, selectedPlayerIds],
  );
  const activeLineup = lineups[activeQuarter];
  const activeFormation = formations.find(
    ({ id }) => id === activeLineup?.formationId,
  );
  const requiredPlayerCount = Math.min(11, selectedPlayers.length);
  const maximumFeasibleMinimum = Math.min(
    quarterCount,
    selectedPlayers.length === 0
      ? 0
      : Math.floor(
          (requiredPlayerCount * quarterCount) / selectedPlayers.length,
        ),
  );
  useEffect(() => {
    const nextMinimum = Math.min(minimumQuarters, maximumFeasibleMinimum);

    if (nextMinimum !== minimumQuarters) {
      setMinimumQuarters(nextMinimum);
      setMinimumQuartersInput(String(nextMinimum));
    }
  }, [maximumFeasibleMinimum, minimumQuarters]);

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

  function toggleAttendance(playerId: string) {
    setSelectedPlayerIds((current) =>
      current.includes(playerId)
        ? current.filter((id) => id !== playerId)
        : [...current, playerId],
    );
  }

  function toggleAllAttendance() {
    setSelectedPlayerIds(
      selectedPlayerIds.length === players.length
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
    const maximumMinimum =
      selectedPlayers.length === 0
        ? 0
        : Math.min(
            nextCount,
            Math.floor(
              (Math.min(11, selectedPlayers.length) * nextCount) /
                selectedPlayers.length,
            ),
          );
    const nextMinimum = Math.min(minimumQuarters, maximumMinimum);

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

    const validatedMinimum = Math.min(nextMinimum, maximumFeasibleMinimum);
    setMinimumQuarters(validatedMinimum);
    setMinimumQuartersInput(String(validatedMinimum));
  }

  function generateLineups() {
    if (selectedPlayers.length === 0) {
      setNotice('오늘 경기 참석 선수를 한 명 이상 선택해 주세요.');
      setSetupStep(1);
      return;
    }

    if (minimumQuarters > maximumFeasibleMinimum) {
      setNotice(
        `현재 인원과 쿼터 수에서 선수당 최소 ${maximumFeasibleMinimum}쿼터까지 보장할 수 있습니다.`,
      );
      setSetupStep(3);
      return;
    }

    setLineups(
      createLineups({
        players: selectedPlayers,
        quarterCount,
        mode: formationMode,
        formationId,
        minimumQuarters,
        isVerticalPitch,
      }),
    );
    setActiveQuarter(0);
    setIsSetupOpen(false);
    setSetupStep(1);
    setNotice(
      `${selectedPlayers.length}명 참석 · ${quarterCount}쿼터 라인업을 만들었습니다.`,
    );
  }

  function addPlayer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newPlayerName.trim();
    const age = Number(newPlayerAge);

    if (!name || !Number.isInteger(age) || age < 15 || age > 90) {
      setNotice('이름과 15~90세 사이의 나이를 입력해 주세요.');
      return;
    }

    if (newPlayerPositions.length === 0) {
      setNotice('선호 포지션을 하나 이상 선택해 주세요.');
      return;
    }

    const player: Player = {
      id: crypto.randomUUID(),
      name,
      age,
      preferredPositions: newPlayerPositions,
      type: newPlayerType,
    };
    const shouldReplaceSampleRoster =
      isSampleData && playerFormSource === 'menu';

    setPlayers((current) =>
      shouldReplaceSampleRoster ? [player] : [...current, player],
    );
    setIsSampleData(shouldReplaceSampleRoster ? false : isSampleData);
    setSelectedPlayerIds((current) =>
      shouldReplaceSampleRoster ? [player.id] : [...current, player.id],
    );
    setNewPlayerName('');
    setNewPlayerAge('');
    setNewPlayerPositions([]);
    setNewPlayerType('member');
    setNotice(`${name} 선수를 등록하고 오늘 경기 참석자로 추가했습니다.`);
    setIsAddingPlayer(false);
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

      return withoutAny.length < 3 ? [...withoutAny, position] : withoutAny;
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
    setLineups((current) =>
      current.map((quarter, index) => {
        if (index !== activeQuarter) return quarter;

        return {
          ...quarter,
          slots: quarter.slots.map((slot) =>
            slot.playerId === playerId ? { ...slot, ...coordinates } : slot,
          ),
        };
      }),
    );
  }

  function handlePlayerPointerDown(
    event: ReactPointerEvent<HTMLButtonElement>,
    playerId: string,
    x: number,
    y: number,
  ) {
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
        <a className="flex items-center gap-2" href="/" aria-label="마이팀 홈">
          <span className="grid size-8 place-items-center rounded-lg bg-brand-700 text-sm font-black text-white">
            M
          </span>
          <span className="text-base font-extrabold leading-none">마이팀</span>
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
            <div className="px-3 py-2 text-xs font-bold text-ink-faint">
              팀 관리
            </div>
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
            {isSampleData && (
              <button
                type="button"
                className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-danger hover:bg-surface-subtle"
                onClick={() => {
                  setPlayers([]);
                  setSelectedPlayerIds([]);
                  setLineups([]);
                  setIsSampleData(false);
                  setIsMenuOpen(false);
                  setNotice(
                    '예시 명단을 비웠습니다. 메뉴에서 선수를 등록해 주세요.',
                  );
                }}
              >
                예시 명단 비우기
              </button>
            )}
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

      <section className="board-area" aria-label="전술 보드">
        <div className="board-meta flex items-center justify-between px-3 py-2 text-xs font-bold text-ink-muted">
          <span>
            {activeQuarter + 1}쿼터 · {activeFormation?.label ?? formationId}
          </span>
          <span>{selectedPlayers.length}명 참석</span>
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
                const currentPlayer = selectedPlayers.find(
                  ({ id }) => id === slot.playerId,
                );
                if (!currentPlayer) return null;

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
                    className="player-marker"
                    aria-label={`${currentPlayer.name}, 전술 보드에서 드래그해 위치 이동`}
                    style={{
                      left: `${displayCoordinates.x}%`,
                      top: `${displayCoordinates.y}%`,
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
                    <span className="player-name">{currentPlayer.name}</span>
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
                하단 버튼을 눌러 오늘 라인업을 구성하세요.
              </p>
            </div>
          )}
        </div>

        {lineups.length > 0 && (
          <div className="quarter-tabs flex gap-2 overflow-x-auto px-3 py-2">
            {lineups.map((quarter, index) => (
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
              {activeFormation?.label ?? formationId}
            </span>
          </div>
        )}
      </section>

      <footer className="app-footer border-t border-line bg-surface px-3 py-2.5">
        <Button
          className="w-full"
          size="md"
          onClick={() => {
            setIsSetupOpen(true);
            setSetupStep(1);
            setNotice('');
          }}
        >
          <span aria-hidden="true">✦</span>
          오늘의 라인업 분배
        </Button>
      </footer>

      {isSetupOpen && (
        <div className="sheet-backdrop" role="presentation">
          <section
            className="setup-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="setup-title"
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
                className="grid size-9 place-items-center rounded-full text-lg text-ink-muted hover:bg-surface-subtle"
                aria-label="설정 닫기"
                onClick={() => setIsSetupOpen(false)}
              >
                ×
              </button>
            </div>

            <div className="sheet-content">
              {setupStep === 1 && (
                <div className="grid gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-ink-muted">
                      참석 선수 선택
                    </span>
                    <button
                      type="button"
                      className="text-sm font-bold text-brand-700"
                      onClick={toggleAllAttendance}
                    >
                      {selectedPlayerIds.length === players.length
                        ? '전체 해제'
                        : '전체 선택'}
                    </button>
                  </div>
                  <div className="grid grid-cols-[1fr_auto] items-end gap-2">
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
                    <button
                      type="button"
                      className="min-h-12 whitespace-nowrap rounded-xl bg-brand-50 px-3 text-sm font-bold text-brand-800"
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
                            <label
                              key={player.id}
                              className={`flex min-h-14 cursor-pointer items-center gap-3 px-3 py-2 ${checked ? '' : 'opacity-55'}`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
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
                                    {player.age}세
                                  </span>
                                </span>
                                <span className="block truncate text-xs text-ink-muted">
                                  {player.preferredPositions.join(' · ')}
                                </span>
                              </span>
                              <span className="text-xs font-semibold text-ink-faint">
                                {player.type === 'guest' ? '용병' : '회원'}
                              </span>
                            </label>
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
                      예시 명단입니다. 상단 메뉴에서 비우고 팀원을 등록할 수
                      있어요.
                    </p>
                  )}
                </div>
              )}

              {setupStep === 2 && (
                <div className="grid gap-3">
                  <p className="text-sm font-bold text-ink-muted">
                    오늘 경기 형태를 선택하세요.
                  </p>
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
                  {matchMode === 'scrimmage' && (
                    <p className="rounded-xl bg-accent-50 px-3 py-2 text-xs font-medium text-accent-700">
                      자체전 팀 나누기는 다음 단계에서 이어서 지원할 예정입니다.
                      현재는 한 팀 전술 보드를 구성합니다.
                    </p>
                  )}
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
                      max={maximumFeasibleMinimum}
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
                          count > maximumFeasibleMinimum
                        ) {
                          setMinimumQuartersInput(String(minimumQuarters));
                        }
                      }}
                      required
                    />
                  </div>
                  <p className="text-xs text-ink-muted">
                    {selectedPlayers.length}명 참석 · 선수별 최소 출전은 0~
                    {maximumFeasibleMinimum}쿼터까지 설정할 수 있습니다.
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
        <div className="sheet-backdrop" role="presentation">
          <section
            className="setup-sheet player-form-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="player-form-title"
          >
            <div className="sheet-handle" />
            <div className="flex items-center justify-between px-4 pb-3">
              <h2 id="player-form-title" className="text-lg font-extrabold">
                {playerFormSource === 'attendees' ? '용병 추가' : '선수 등록'}
              </h2>
              <button
                type="button"
                className="grid size-9 place-items-center rounded-full text-lg text-ink-muted hover:bg-surface-subtle"
                aria-label="등록 닫기"
                onClick={() => setIsAddingPlayer(false)}
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
                  label="나이"
                  name="playerAge"
                  type="number"
                  min={15}
                  max={90}
                  value={newPlayerAge}
                  onChange={(event) => setNewPlayerAge(event.target.value)}
                  placeholder="예: 32"
                  required
                />
              </div>
              {playerFormSource === 'attendees' ? (
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
                  <span className="font-medium text-ink-faint">최대 3개</span>
                </legend>
                <div className="flex flex-wrap gap-2">
                  {positions.map((position) => {
                    const selected = newPlayerPositions.includes(position);
                    const disabled =
                      !selected &&
                      newPlayerPositions.length >= 3 &&
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
                  선수 등록하기
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
