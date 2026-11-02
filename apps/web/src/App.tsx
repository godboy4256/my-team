import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Button, Card, PageContainer, TextInput } from './components';
import {
  createLineups,
  demoPlayers,
  formations,
  positions,
} from './features/lineup/lineup';
import type {
  FormationMode,
  Player,
  Position,
  QuarterLineup,
} from './features/lineup/lineup';

const STORAGE_KEY = 'my-team-lineup-v1';

type StoredState = {
  players: Player[];
  selectedPlayerIds: string[];
  isSampleData: boolean;
};

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

function getLineGroup(position: Position): number {
  if (position === 'GK') return 0;
  if (['센터백', '사이드백'].includes(position)) return 1;
  if (['수비형 미드필더', '미드필더', '공격형 미드필더'].includes(position)) {
    return 2;
  }
  return 3;
}

function App() {
  const initialState = useMemo(readStoredState, []);
  const [players, setPlayers] = useState<Player[]>(initialState.players);
  const [isSampleData, setIsSampleData] = useState(initialState.isSampleData);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>(
    initialState.selectedPlayerIds,
  );
  const [quarterCount, setQuarterCount] = useState(4);
  const [minimumQuarters, setMinimumQuarters] = useState(2);
  const [formationMode, setFormationMode] = useState<FormationMode>('same');
  const [formationId, setFormationId] = useState('4-3-3');
  const [lineups, setLineups] = useState<QuarterLineup[]>(() => {
    const attendees = initialState.players.filter(({ id }) =>
      initialState.selectedPlayerIds.includes(id),
    );

    return attendees.length
      ? createLineups({
          players: attendees,
          quarterCount: 4,
          mode: 'same',
          formationId: '4-3-3',
          minimumQuarters: 2,
        })
      : [];
  });
  const [activeQuarter, setActiveQuarter] = useState(0);
  const [isAddingPlayer, setIsAddingPlayer] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState('');
  const [newPlayerAge, setNewPlayerAge] = useState('');
  const [newPlayerPositions, setNewPlayerPositions] = useState<Position[]>([]);
  const [newPlayerType, setNewPlayerType] = useState<Player['type']>('member');
  const [notice, setNotice] = useState('');

  const selectedPlayers = useMemo(
    () => players.filter(({ id }) => selectedPlayerIds.includes(id)),
    [players, selectedPlayerIds],
  );
  const activeLineup = lineups[activeQuarter];
  const activeFormation = formations.find(
    ({ id }) => id === activeLineup?.formationId,
  );
  const availablePlayers = selectedPlayers.length;
  const requiredPlayerCount = Math.min(11, availablePlayers);
  const totalQuarterSlots = requiredPlayerCount * quarterCount;
  const requestedMinimumSlots = minimumQuarters * availablePlayers;
  const canMeetMinimum = requestedMinimumSlots <= totalQuarterSlots;

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
    if (selectedPlayers.length === 0) {
      setLineups([]);
      setActiveQuarter(0);
      return;
    }

    setLineups(
      createLineups({
        players: selectedPlayers,
        quarterCount,
        mode: formationMode,
        formationId,
        minimumQuarters,
      }),
    );
    setActiveQuarter(0);
  }, [
    selectedPlayers,
    quarterCount,
    formationMode,
    formationId,
    minimumQuarters,
  ]);

  function toggleAttendance(playerId: string) {
    setSelectedPlayerIds((current) =>
      current.includes(playerId)
        ? current.filter((id) => id !== playerId)
        : [...current, playerId],
    );
  }

  function generateLineups() {
    if (selectedPlayers.length === 0) {
      setNotice('먼저 오늘 경기 참석 선수를 선택해 주세요.');
      return;
    }

    const generated = createLineups({
      players: selectedPlayers,
      quarterCount,
      mode: formationMode,
      formationId,
      minimumQuarters,
    });

    setLineups(generated);
    setActiveQuarter(0);
    setNotice(
      canMeetMinimum
        ? ''
        : '현재 인원과 쿼터 수로는 최소 출전 횟수를 모두 보장할 수 없습니다.',
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

    setPlayers((current) => (isSampleData ? [player] : [...current, player]));
    setIsSampleData(false);
    setSelectedPlayerIds((current) =>
      isSampleData ? [player.id] : [...current, player.id],
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

  function changeQuarterPlayer(
    quarterIndex: number,
    slotIndex: number,
    playerId: string,
  ) {
    setLineups((current) =>
      current.map((quarter, index) => {
        if (index !== quarterIndex) return quarter;

        return {
          ...quarter,
          slots: quarter.slots.map((slot, currentSlotIndex) =>
            currentSlotIndex === slotIndex
              ? { ...slot, playerId: playerId || null }
              : slot,
          ),
        };
      }),
    );
  }

  const groupedSlots = useMemo(() => {
    if (!activeLineup) return [];

    return [0, 1, 2, 3].map((group) =>
      activeLineup.slots
        .map((slot, index) => ({ ...slot, index }))
        .filter(({ position }) => getLineGroup(position) === group),
    );
  }, [activeLineup]);

  return (
    <main className="min-h-screen bg-canvas text-ink">
      <PageContainer className="pb-10">
        <header className="flex items-center justify-between border-b border-line py-4 sm:py-5">
          <a
            className="flex items-center gap-3"
            href="/"
            aria-label="마이팀 홈"
          >
            <span className="grid size-10 place-items-center rounded-xl bg-brand-700 text-lg font-black text-white">
              M
            </span>
            <span>
              <span className="block text-base font-extrabold leading-tight">
                마이팀
              </span>
              <span className="text-xs font-medium text-ink-faint">
                FC 우리동네
              </span>
            </span>
          </a>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="hidden rounded-full bg-brand-50 px-3 py-1.5 text-sm font-bold text-brand-800 sm:inline-flex">
              경기 운영
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsAddingPlayer((current) => !current)}
            >
              <span aria-hidden="true">＋</span>
              <span className="hidden sm:inline">선수 등록</span>
              <span className="sm:hidden">등록</span>
            </Button>
          </div>
        </header>

        <section className="flex flex-col justify-between gap-3 py-5 sm:flex-row sm:items-center sm:py-6">
          <div>
            <p className="text-xs font-bold text-brand-700">
              FC 우리동네 · 오늘 경기
            </p>
            <div className="mt-0.5 flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                쿼터별 라인업
              </h1>
              {isSampleData && (
                <span className="rounded-full bg-accent-100 px-2.5 py-1 text-xs font-bold text-accent-700">
                  예시 명단
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="rounded-lg border border-line bg-surface px-3 py-2 font-semibold text-ink-muted">
              참석{' '}
              <strong className="ml-1 text-brand-700">
                {availablePlayers}명
              </strong>
            </span>
            <span className="rounded-lg border border-line bg-surface px-3 py-2 font-semibold text-ink-muted">
              {quarterCount}쿼터 · {activeFormation?.label ?? formationId}
            </span>
          </div>
        </section>

        {notice && (
          <div
            role="status"
            className="mb-5 flex items-start justify-between gap-4 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-medium text-brand-900"
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

        {isAddingPlayer && (
          <Card className="mb-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-brand-700">팀 관리</p>
                <h2 className="mt-1 text-xl font-extrabold">선수 등록</h2>
                <p className="mt-1 text-sm text-ink-muted">
                  스탯 입력란은 세부 항목이 정해진 뒤 추가할게요.
                </p>
              </div>
              <button
                type="button"
                className="rounded-lg px-3 py-2 text-sm font-bold text-ink-muted hover:bg-surface-subtle"
                onClick={() => setIsAddingPlayer(false)}
              >
                닫기
              </button>
            </div>
            <form onSubmit={addPlayer} className="grid gap-5">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_160px_220px]">
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
              </div>

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
                        className={`min-h-10 rounded-full border px-4 text-sm font-semibold transition ${selected ? 'border-brand-700 bg-brand-700 text-white' : 'border-line bg-surface text-ink-muted hover:border-brand-500'} disabled:cursor-not-allowed disabled:opacity-40`}
                      >
                        {position}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <div className="flex justify-end">
                <Button type="submit">선수 등록하기</Button>
              </div>
            </form>
          </Card>
        )}

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(320px,0.82fr)_minmax(0,1.18fr)] xl:gap-6">
          <div className="order-2 grid gap-5 lg:order-1">
            <Card>
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-brand-700">
                    01 · 경기 설정
                  </p>
                  <h2 className="mt-1 text-xl font-extrabold">
                    오늘 경기 구성
                  </h2>
                </div>
                <span className="rounded-full bg-surface-subtle px-3 py-1 text-xs font-bold text-ink-muted">
                  팀매치
                </span>
              </div>

              <div className="grid gap-5">
                <fieldset className="grid gap-2">
                  <legend className="text-sm font-bold">쿼터 수</legend>
                  <div className="grid grid-cols-4 gap-2">
                    {[2, 3, 4, 6].map((count) => (
                      <button
                        key={count}
                        type="button"
                        aria-pressed={quarterCount === count}
                        onClick={() => {
                          setQuarterCount(count);
                          setMinimumQuarters((current) =>
                            Math.min(current, count),
                          );
                        }}
                        className={`min-h-11 rounded-xl border text-sm font-bold transition ${quarterCount === count ? 'border-brand-700 bg-brand-50 text-brand-800 ring-1 ring-brand-700' : 'border-line bg-surface text-ink-muted hover:border-brand-500'}`}
                      >
                        {count}쿼터
                      </button>
                    ))}
                  </div>
                </fieldset>

                <fieldset className="grid gap-2">
                  <legend className="text-sm font-bold">
                    포메이션 구성 방식
                  </legend>
                  <div className="grid gap-2">
                    {(
                      [
                        ['same', '전 쿼터 동일'],
                        ['different', '쿼터별 변경'],
                        ['recommended', '선수 기준 추천'],
                      ] as const
                    ).map(([mode, title]) => (
                      <button
                        key={mode}
                        type="button"
                        aria-pressed={formationMode === mode}
                        onClick={() => {
                          setFormationMode(mode);
                        }}
                        className={`flex min-h-12 items-center gap-3 rounded-xl border px-3 text-left transition ${formationMode === mode ? 'border-brand-700 bg-brand-50' : 'border-line hover:border-brand-500'}`}
                      >
                        <span
                          className={`grid size-5 shrink-0 place-items-center rounded-full border ${formationMode === mode ? 'border-brand-700' : 'border-line'}`}
                        >
                          {formationMode === mode && (
                            <span className="size-2.5 rounded-full bg-brand-700" />
                          )}
                        </span>
                        <span>
                          <span className="block text-sm font-bold">
                            {title}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </fieldset>

                {formationMode === 'same' && (
                  <label className="grid gap-2 text-sm font-bold">
                    포메이션
                    <select
                      value={formationId}
                      onChange={(event) => {
                        setFormationId(event.target.value);
                      }}
                      className="min-h-12 rounded-xl border border-line bg-surface px-4 text-base font-semibold text-ink outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-100"
                    >
                      {formations.map((formation) => (
                        <option key={formation.id} value={formation.id}>
                          {formation.label} · {formation.description}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <label className="grid gap-2 text-sm font-bold">
                  선수별 최소 출전 쿼터
                  <select
                    value={minimumQuarters}
                    onChange={(event) => {
                      setMinimumQuarters(Number(event.target.value));
                    }}
                    className="min-h-12 rounded-xl border border-line bg-surface px-4 text-base font-semibold text-ink outline-none focus:border-brand-600 focus:ring-4 focus:ring-brand-100"
                  >
                    {Array.from({ length: quarterCount + 1 }, (_, count) => (
                      <option key={count} value={count}>
                        {count === 0 ? '최소 보장 없음' : `${count}쿼터 이상`}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </Card>

            <Card className="p-0">
              <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
                <div>
                  <p className="text-sm font-bold text-brand-700">
                    02 · 참석 확인
                  </p>
                  <h2 className="mt-1 text-xl font-extrabold">오늘 뛸 선수</h2>
                </div>
                <span className="rounded-lg bg-brand-50 px-3 py-1.5 text-sm font-extrabold text-brand-800">
                  {availablePlayers}명 참석
                </span>
              </div>
              {isSampleData && (
                <div className="flex items-center justify-between gap-3 border-b border-line bg-accent-50 px-5 py-2.5 text-xs text-accent-700 sm:px-6">
                  <span>체험용 선수 명단이에요.</span>
                  <button
                    type="button"
                    className="shrink-0 font-bold underline underline-offset-2"
                    onClick={() => {
                      setPlayers([]);
                      setSelectedPlayerIds([]);
                      setIsSampleData(false);
                    }}
                  >
                    비우고 등록
                  </button>
                </div>
              )}
              <div className="max-h-[440px] divide-y divide-line overflow-y-auto">
                {players.map((player) => {
                  const checked = selectedPlayerIds.includes(player.id);

                  return (
                    <label
                      key={player.id}
                      className={`flex min-h-[68px] cursor-pointer items-center gap-3 px-5 py-3 transition hover:bg-surface-subtle sm:px-6 ${checked ? '' : 'opacity-55'}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleAttendance(player.id)}
                        className="size-5 accent-brand-700"
                      />
                      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-100 text-sm font-extrabold text-brand-800">
                        {player.name.slice(0, 1)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate font-bold">
                            {player.name}
                          </span>
                          <span className="shrink-0 text-xs text-ink-faint">
                            {player.age}세
                          </span>
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-ink-muted">
                          {player.preferredPositions.join(' · ')}
                        </span>
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${player.type === 'guest' ? 'bg-accent-100 text-accent-700' : 'bg-surface-subtle text-ink-muted'}`}
                      >
                        {player.type === 'guest' ? '용병' : '회원'}
                      </span>
                    </label>
                  );
                })}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-5 py-3 sm:px-6">
                <button
                  type="button"
                  className="text-sm font-bold text-brand-700 hover:text-brand-900"
                  onClick={() =>
                    setSelectedPlayerIds(
                      selectedPlayerIds.length === players.length
                        ? []
                        : players.map(({ id }) => id),
                    )
                  }
                >
                  {selectedPlayerIds.length === players.length
                    ? '전체 해제'
                    : '전체 참석'}
                </button>
                <button
                  type="button"
                  className="text-sm font-bold text-ink-muted hover:text-ink"
                  onClick={() => setIsAddingPlayer(true)}
                >
                  ＋ 선수 등록
                </button>
              </div>
            </Card>
          </div>

          <div className="order-1 grid gap-5 lg:sticky lg:top-5 lg:order-2">
            <Card className="overflow-hidden p-0">
              <div className="flex flex-col justify-between gap-4 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:px-6">
                <div>
                  <h2 className="mt-1 text-xl font-extrabold">
                    {activeQuarter >= 0 && lineups.length > 0
                      ? `${activeQuarter + 1}쿼터 배치`
                      : '전술 보드'}
                  </h2>
                </div>
                <Button onClick={generateLineups}>
                  <span aria-hidden="true">✦</span>
                  자동 배치 다시 적용
                </Button>
              </div>

              {lineups.length > 0 && (
                <div className="flex gap-2 overflow-x-auto border-b border-line px-5 py-3 sm:px-6">
                  {lineups.map((quarter, index) => (
                    <button
                      key={`${quarter.formationId}-${index}`}
                      type="button"
                      aria-pressed={activeQuarter === index}
                      onClick={() => setActiveQuarter(index)}
                      className={`min-h-10 shrink-0 rounded-lg px-4 text-sm font-bold ${activeQuarter === index ? 'bg-brand-700 text-white' : 'bg-surface-subtle text-ink-muted hover:bg-brand-50'}`}
                    >
                      {index + 1}쿼터
                    </button>
                  ))}
                  {activeFormation && (
                    <span className="ml-auto hidden self-center text-sm font-extrabold text-ink sm:block">
                      {activeFormation.label}
                    </span>
                  )}
                </div>
              )}

              <div className="bg-surface-subtle p-3 sm:p-5">
                <div className="relative min-h-[460px] overflow-hidden rounded-[1.5rem] bg-[#287d52] p-4 shadow-inner sm:min-h-[560px] sm:p-6">
                  <div className="pointer-events-none absolute inset-3 rounded-[1.2rem] border border-white/45 sm:inset-4" />
                  <div className="pointer-events-none absolute left-1/2 top-4 bottom-4 border-l border-white/40" />
                  <div className="pointer-events-none absolute left-1/2 top-1/2 size-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/40 sm:size-32" />
                  <div className="pointer-events-none absolute left-1/2 top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/60" />
                  <div
                    className="pointer-events-none absolute left-1/2 top-3 w-28 -translate-x-1/2 rounded-b-xl border border-t-0 border-white/40 sm:top-4 sm:w-40"
                    style={{ height: '13%' }}
                  />
                  <div
                    className="pointer-events-none absolute bottom-3 left-1/2 w-28 -translate-x-1/2 rounded-t-xl border border-b-0 border-white/40 sm:bottom-4 sm:w-40"
                    style={{ height: '13%' }}
                  />

                  {activeLineup ? (
                    <div className="relative flex min-h-[428px] flex-col justify-around py-3 sm:min-h-[512px]">
                      {groupedSlots.map((group, groupIndex) => (
                        <div
                          key={groupIndex}
                          className="flex flex-wrap justify-center gap-2 sm:gap-3"
                        >
                          {group.map((slot) => {
                            const currentPlayer = selectedPlayers.find(
                              ({ id }) => id === slot.playerId,
                            );
                            const usedIds = new Set(
                              activeLineup.slots
                                .filter((_, index) => index !== slot.index)
                                .map(({ playerId }) => playerId)
                                .filter((id): id is string => Boolean(id)),
                            );

                            return (
                              <label
                                key={`${slot.position}-${slot.index}`}
                                className="flex w-[82px] flex-col items-center gap-1.5 sm:w-[100px]"
                              >
                                <span className="grid size-12 place-items-center rounded-full border-[3px] border-white bg-white text-xs font-black text-brand-800 shadow-lg sm:size-14 sm:text-sm">
                                  {currentPlayer?.name.slice(0, 1) ?? '—'}
                                </span>
                                <span className="max-w-full truncate rounded-full bg-black/25 px-2 py-0.5 text-[11px] font-bold text-white sm:text-xs">
                                  {slot.position}
                                </span>
                                <select
                                  aria-label={`${slot.position} 선수 선택`}
                                  value={slot.playerId ?? ''}
                                  onChange={(event) =>
                                    changeQuarterPlayer(
                                      activeQuarter,
                                      slot.index,
                                      event.target.value,
                                    )
                                  }
                                  className="w-full rounded-lg border border-white/45 bg-white/95 px-1.5 py-1.5 text-center text-xs font-bold text-ink outline-none focus:ring-2 focus:ring-accent-500 sm:px-2 sm:text-sm"
                                >
                                  <option value="">선수 선택</option>
                                  {selectedPlayers
                                    .filter(
                                      ({ id }) =>
                                        !usedIds.has(id) ||
                                        id === slot.playerId,
                                    )
                                    .map((player) => (
                                      <option key={player.id} value={player.id}>
                                        {player.name}
                                      </option>
                                    ))}
                                </select>
                              </label>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="relative grid min-h-[428px] place-items-center text-center sm:min-h-[512px]">
                      <div className="max-w-xs rounded-2xl bg-black/20 px-5 py-6 text-white backdrop-blur-sm">
                        <span
                          className="mx-auto grid size-12 place-items-center rounded-2xl bg-white/15 text-2xl"
                          aria-hidden="true"
                        >
                          ⚽
                        </span>
                        <p className="mt-4 text-lg font-extrabold">
                          라인업을 만들 준비가 됐어요
                        </p>
                        <p className="mt-2 text-sm leading-6 text-white/80">
                          참석자를 확인하고 생성 버튼을 누르면 쿼터별 배치를
                          보여드려요.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center sm:px-6">
                <div>
                  <p className="text-sm font-bold">
                    {availablePlayers}명 참석 · {quarterCount}쿼터
                  </p>
                  <p className="mt-1 text-xs leading-5 text-ink-muted">
                    {canMeetMinimum
                      ? `최소 ${minimumQuarters}쿼터 출전 기준 적용`
                      : `최소 ${minimumQuarters}쿼터 기준을 충족할 수 없음`}
                  </p>
                </div>
                {lineups.length > 0 && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      const current = lineups[activeQuarter];
                      const text = current?.slots
                        .map((slot) => {
                          const player = selectedPlayers.find(
                            ({ id }) => id === slot.playerId,
                          );
                          return `${slot.position}: ${player?.name ?? '미정'}`;
                        })
                        .join('\n');

                      if (text && navigator.clipboard) {
                        void navigator.clipboard.writeText(
                          `${activeQuarter + 1}쿼터 라인업\n${text}`,
                        );
                        setNotice(
                          '현재 쿼터 라인업을 클립보드에 복사했습니다.',
                        );
                      }
                    }}
                  >
                    라인업 복사
                  </Button>
                )}
              </div>
            </Card>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ['공평한 배치', '쿼터별 출전 수를 고르게 고려'],
                ['선호 포지션', '1~3순위와 무관 옵션 반영'],
                ['직접 조정', '생성 후 선수 배치를 수정'],
              ].map(([title, description], index) => (
                <div
                  key={title}
                  className="rounded-xl border border-line bg-surface px-4 py-3"
                >
                  <p className="text-xs font-bold text-brand-700">
                    0{index + 1}
                  </p>
                  <p className="mt-1 text-sm font-extrabold">{title}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-ink-faint">
          명단은 현재 브라우저에 저장됩니다.
        </p>
      </PageContainer>
    </main>
  );
}

export default App;
