import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Button, TextInput } from '../../components';
import { fetchEvaluationQuestions } from '../stats/evaluation';
import type { EvaluationQuestion } from '../stats/evaluation';

type User = { id: string; name: string; age: number; username: string };
type Team = {
  id: string;
  name: string;
  inviteCode: string;
  playerCount: number;
};
type TeamViewerView = {
  team: {
    id: string;
    name: string;
    homeTown: string;
    homeGround: string;
    description: string;
  };
  players: Array<{
    id: string;
    name: string;
    jerseyNumber: number | null;
    birthYear: number;
    preferredPositions: string[];
    type: 'member' | 'guest';
    evaluation: Record<string, number> | null;
  }>;
  tactics: Array<{
    id: string;
    name: string;
    data: Record<string, unknown>;
    updatedAt: string;
  }>;
};

async function getErrorMessage(response: Response) {
  try {
    const body: unknown = await response.json();
    if (typeof body === 'object' && body !== null && 'message' in body) {
      const message = body.message;
      if (typeof message === 'string') return message;
      if (Array.isArray(message))
        return message
          .filter((item): item is string => typeof item === 'string')
          .join(' ');
    }
  } catch {
    // 응답 본문이 JSON이 아니면 아래 기본 문구를 사용합니다.
  }
  return '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.';
}

function PageFrame({ children }: { children: React.ReactNode }) {
  return (
    <main className="access-page">
      <div className="access-page-inner">
        <a
          href="/welcome"
          className="access-brand"
          aria-label="MYTEAM 시작 화면"
        >
          <span className="access-brand-mark" aria-hidden="true">
            ⚽
          </span>
          <span>
            MY<span>TEAM</span>
          </span>
        </a>
        {children}
      </div>
    </main>
  );
}

function WelcomePage() {
  const navigate = useNavigate();
  return (
    <PageFrame>
      <section className="access-card">
        <p className="access-eyebrow">우리 팀을 더 잘 관리하는 방법</p>
        <h1 className="access-title">
          팀의 기록과 운영을
          <br />
          한곳에서
        </h1>
        <p className="access-description">
          팀 관리자는 계정으로 팀을 운영하고, 팀원은 초대 링크로 팀 현황과
          공유된 전술을 확인할 수 있어요.
        </p>
        <div className="access-actions">
          <Button className="w-full" onClick={() => navigate('/login')}>
            로그인
          </Button>
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => navigate('/signup')}
          >
            회원가입
          </Button>
          <Button
            variant="quiet"
            className="w-full"
            onClick={() => navigate('/join')}
          >
            팀 입장
          </Button>
        </div>
        <div className="access-guide">
          <p>
            <strong>팀 관리자</strong>
            <span>가입 후 팀과 선수 명단을 관리해요.</span>
          </p>
          <p>
            <strong>선수</strong>
            <span>초대 코드로 팀 대시보드를 조회해요.</span>
          </p>
        </div>
      </section>
    </PageFrame>
  );
}

function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const navigate = useNavigate();
  const isSignup = mode === 'signup';
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const response = await fetch(
        `/api/auth/${isSignup ? 'signup' : 'login'}`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...(isSignup ? { name, age: Number(age) } : {}),
            username,
            password,
          }),
        },
      );
      if (!response.ok) throw new Error(await getErrorMessage(response));
      navigate('/teams');
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : '요청에 실패했습니다.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PageFrame>
      <section className="access-card">
        <button
          type="button"
          className="access-back"
          onClick={() => navigate('/welcome')}
        >
          ← 처음으로
        </button>
        <h1 className="access-title">
          {isSignup ? '관리자 회원가입' : '로그인'}
        </h1>
        <p className="access-description">
          {isSignup
            ? '팀을 만들고 관리할 계정을 만들어요.'
            : 'MYTEAM 계정으로 로그인해 주세요.'}
        </p>
        <form className="access-form" onSubmit={submit}>
          {isSignup && (
            <>
              <TextInput
                label="이름"
                name="name"
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                maxLength={80}
              />
              <TextInput
                label="나이"
                name="age"
                type="number"
                min={13}
                max={100}
                value={age}
                onChange={(event) => setAge(event.target.value)}
                required
              />
            </>
          )}
          <TextInput
            label="아이디"
            name="username"
            autoComplete={isSignup ? 'username' : 'username'}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
            minLength={3}
            maxLength={30}
          />
          <TextInput
            label="비밀번호"
            name="password"
            type="password"
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
            maxLength={128}
          />
          {isSignup && (
            <p className="access-hint">
              비밀번호는 8자 이상으로 입력해 주세요.
            </p>
          )}
          {error && (
            <p className="access-error" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" className="mt-2 w-full" disabled={isSubmitting}>
            {isSubmitting ? '처리 중…' : isSignup ? '가입하고 계속' : '로그인'}
          </Button>
        </form>
        <button
          type="button"
          className="access-switch"
          onClick={() => navigate(isSignup ? '/login' : '/signup')}
        >
          {isSignup ? '이미 계정이 있나요? 로그인' : '처음이신가요? 회원가입'}
        </button>
      </section>
    </PageFrame>
  );
}

function TeamsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const showTeamList =
    typeof location.state === 'object' &&
    location.state !== null &&
    'showTeamList' in location.state &&
    location.state.showTeamList === true;
  const [user, setUser] = useState<User | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [userResponse, teamsResponse] = await Promise.all([
          fetch('/api/auth/me', { credentials: 'include' }),
          fetch('/api/teams', { credentials: 'include' }),
        ]);
        if (!userResponse.ok || !teamsResponse.ok) {
          navigate('/login', { replace: true });
          return;
        }
        const userPayload = (await userResponse.json()) as { user: User };
        const teamPayload = (await teamsResponse.json()) as Team[];
        if (!active) return;
        setUser(userPayload.user);
        setTeams(teamPayload);
        if (teamPayload.length === 1 && !showTeamList) {
          sessionStorage.setItem('my-team-active-team', teamPayload[0].id);
          navigate('/', { replace: true });
        }
      } catch {
        if (active)
          setError('팀 목록을 불러오지 못했습니다. API 연결을 확인해 주세요.');
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [navigate, showTeamList]);

  async function logOut() {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    sessionStorage.removeItem('my-team-active-team');
    navigate('/welcome');
  }

  return (
    <PageFrame>
      <section className="access-card">
        <div className="access-heading-row">
          <div>
            <p className="access-eyebrow">관리자 공간</p>
            <h1 className="access-title">
              {user ? `${user.name}님의 팀` : '나의 팀'}
            </h1>
          </div>
          <button type="button" className="access-switch" onClick={logOut}>
            로그아웃
          </button>
        </div>
        {teams.length > 1 || showTeamList ? (
          <p className="access-description">관리할 팀을 선택해 주세요.</p>
        ) : teams.length === 0 ? (
          <p className="access-description">
            아직 등록된 팀이 없어요. 첫 팀을 만들어 시작해 보세요.
          </p>
        ) : (
          <p className="access-description">팀으로 이동하고 있어요.</p>
        )}
        {error && (
          <p className="access-error" role="alert">
            {error}
          </p>
        )}
        <div className="access-actions">
          {teams.map((team) => (
            <button
              type="button"
              key={team.id}
              className="access-team-choice"
              onClick={() => {
                sessionStorage.setItem('my-team-active-team', team.id);
                navigate('/');
              }}
            >
              <span>
                <strong>{team.name}</strong>
                <small>
                  선수 {team.playerCount}명 · 초대 코드 {team.inviteCode}
                </small>
              </span>
              <span aria-hidden="true">›</span>
            </button>
          ))}
          <Button className="w-full" onClick={() => navigate('/teams/new')}>
            + 새 팀 만들기
          </Button>
          <Button
            variant="quiet"
            className="w-full"
            onClick={() => navigate('/join')}
          >
            선수로 팀 기록 보기
          </Button>
        </div>
      </section>
    </PageFrame>
  );
}

function CreateTeamPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/teams', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) throw new Error(await getErrorMessage(response));
      const team = (await response.json()) as Team;
      sessionStorage.setItem('my-team-active-team', team.id);
      navigate('/');
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : '팀을 만들지 못했습니다.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }
  return (
    <PageFrame>
      <section className="access-card">
        <button
          type="button"
          className="access-back"
          onClick={() => navigate('/teams')}
        >
          ← 나의 팀
        </button>
        <h1 className="access-title">새 팀 만들기</h1>
        <p className="access-description">
          팀 이름을 정하면 팀 초대 코드가 만들어집니다.
        </p>
        <form className="access-form" onSubmit={submit}>
          <TextInput
            label="팀 이름"
            name="teamName"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            maxLength={100}
            placeholder="예: MYTEAM FC"
          />
          {error && (
            <p className="access-error" role="alert">
              {error}
            </p>
          )}
          <Button className="mt-2 w-full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? '만드는 중…' : '팀 만들기'}
          </Button>
        </form>
      </section>
    </PageFrame>
  );
}

function JoinTeamPage() {
  const navigate = useNavigate();
  const { inviteCode: routeInviteCode } = useParams<{ inviteCode: string }>();
  const [inviteCode, setInviteCode] = useState(routeInviteCode ?? '');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/teams/join', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviteCode,
        }),
      });
      if (!response.ok) throw new Error(await getErrorMessage(response));
      navigate('/my-stats');
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : '팀을 찾지 못했습니다.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }
  return (
    <PageFrame>
      <section className="access-card">
        <button
          type="button"
          className="access-back"
          onClick={() => navigate('/welcome')}
        >
          ← 처음으로
        </button>
        <p className="access-eyebrow">선수용 팀 조회</p>
        <h1 className="access-title">팀에 입장하기</h1>
        <p className="access-description">
          감독이 공유한 초대 코드를 입력하면 팀 대시보드에 입장합니다.
        </p>
        <p className="access-hint">
          한 번 확인하면 이 기기에서 다음 방문 때 자동으로 기록을 불러와요.
        </p>
        <form className="access-form" onSubmit={submit}>
          <TextInput
            label="팀 초대 코드"
            name="inviteCode"
            value={inviteCode}
            onChange={(event) =>
              setInviteCode(event.target.value.toUpperCase())
            }
            required
            autoCapitalize="characters"
          />
          {error && (
            <p className="access-error" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" className="mt-2 w-full" disabled={isSubmitting}>
            {isSubmitting ? '확인 중…' : '팀 대시보드 보기'}
          </Button>
        </form>
      </section>
    </PageFrame>
  );
}

function MyStatsPage() {
  const [view, setView] = useState<TeamViewerView | null>(null);
  const [questions, setQuestions] = useState<EvaluationQuestion[]>([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch('/api/teams/viewer/me', { credentials: 'include' }).then(
        async (response) => {
          if (!response.ok) throw new Error('초대 링크를 다시 열어 주세요.');
          return (await response.json()) as TeamViewerView;
        },
      ),
      fetchEvaluationQuestions(),
    ])
      .then(([teamView, evaluationQuestions]) => {
        if (!active) return;
        setView(teamView);
        setQuestions(evaluationQuestions);
      })
      .catch((caught: unknown) => {
        if (active)
          setError(
            caught instanceof Error
              ? caught.message
              : '팀 정보를 불러오지 못했습니다.',
          );
      });
    return () => {
      active = false;
    };
  }, []);

  const visiblePlayers = (view?.players ?? []).filter((player) =>
    `${player.name} ${player.jerseyNumber ?? ''} ${player.preferredPositions.join(' ')}`
      .toLocaleLowerCase('ko-KR')
      .includes(search.trim().toLocaleLowerCase('ko-KR')),
  );

  if (!view)
    return (
      <PageFrame>
        <section className="access-card">
          <h1 className="access-title">팀 대시보드</h1>
          <p className="access-description">
            {error || '초대 정보를 확인하고 있습니다.'}
          </p>
          {error && (
            <Button className="w-full" onClick={() => navigate('/join')}>
              초대 코드 입력
            </Button>
          )}
        </section>
      </PageFrame>
    );

  return (
    <PageFrame>
      <section className="access-card member-dashboard team-viewer-dashboard">
        <p className="access-eyebrow">팀 대시보드</p>
        <h1 className="access-title">{view.team.name}</h1>
        <p className="access-description">
          {view.team.homeTown}
          {view.team.homeGround ? ` · ${view.team.homeGround}` : ''}
        </p>
        <div className="viewer-summary">
          <strong>{view.players.length}명</strong>
          <span>등록 선수</span>
          <strong>{view.tactics.length}개</strong>
          <span>공유 전술</span>
        </div>
        <section className="member-stats-section">
          <h2 className="text-lg font-extrabold">선수단 기록</h2>
          <TextInput
            label="선수 검색"
            name="viewer-player-search"
            type="search"
            placeholder="이름, 등번호, 포지션 검색"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {visiblePlayers.map((player) => {
            const entries = Object.entries(player.evaluation ?? {});
            const average = entries.length
              ? entries.reduce((sum, [, score]) => sum + score, 0) /
                entries.length
              : null;
            return (
              <article className="viewer-player-card" key={player.id}>
                <div className="viewer-player-heading">
                  <div>
                    <strong>{player.name}</strong>
                    <span>
                      {player.jerseyNumber == null
                        ? ''
                        : `#${player.jerseyNumber} · `}
                      {player.birthYear}년생 ·{' '}
                      {player.preferredPositions.join(' · ')}
                    </span>
                  </div>
                  <span>
                    {average === null ? '미평가' : `평균 ${average.toFixed(1)}`}
                  </span>
                </div>
                {entries.length > 0 && (
                  <div className="viewer-stat-chips">
                    {entries.map(([id, score]) => (
                      <span key={id}>
                        {questions.find((question) => question.id === id)
                          ?.label ?? id}{' '}
                        {score}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
          {visiblePlayers.length === 0 && (
            <p className="member-empty-stats">검색 결과가 없습니다.</p>
          )}
        </section>
        <section className="member-stats-section">
          <h2 className="text-lg font-extrabold">감독이 공유한 전술</h2>
          {view.tactics.length ? (
            view.tactics.map((tactic) => {
              const lineups = Array.isArray(tactic.data['lineups'])
                ? tactic.data['lineups'].filter(
                    (
                      item,
                    ): item is {
                      formationId: string;
                      slots: Array<{
                        playerId: string | null;
                        position: string;
                      }>;
                    } =>
                      typeof item === 'object' &&
                      item !== null &&
                      'formationId' in item &&
                      typeof item.formationId === 'string' &&
                      'slots' in item &&
                      Array.isArray(item.slots),
                  )
                : [];
              return (
                <article className="viewer-player-card" key={tactic.id}>
                  <div className="viewer-player-heading">
                    <strong>{tactic.name}</strong>
                    <span>
                      {new Date(tactic.updatedAt).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                  {lineups.map((quarter, index) => (
                    <div
                      className="viewer-tactic-quarter"
                      key={`${tactic.id}-${index}`}
                    >
                      <strong>
                        {index + 1}쿼터 · {quarter.formationId}
                      </strong>
                      <span>
                        {quarter.slots
                          .map((slot) => {
                            const player = view.players.find(
                              ({ id }) => id === slot.playerId,
                            );
                            return player
                              ? `${slot.position} ${player.name}`
                              : null;
                          })
                          .filter(Boolean)
                          .join(' · ') || '배치 선수가 없습니다.'}
                      </span>
                    </div>
                  ))}
                </article>
              );
            })
          ) : (
            <p className="member-empty-stats">아직 공유된 전술이 없습니다.</p>
          )}
        </section>
      </section>
    </PageFrame>
  );
}

export default function AccessPages() {
  const { pathname } = useLocation();
  if (pathname === '/login') return <AuthForm mode="login" />;
  if (pathname === '/signup') return <AuthForm mode="signup" />;
  if (pathname === '/teams') return <TeamsPage />;
  if (pathname === '/teams/new') return <CreateTeamPage />;
  if (pathname === '/join') return <JoinTeamPage />;
  if (pathname === '/my-stats') return <MyStatsPage />;
  return <WelcomePage />;
}
