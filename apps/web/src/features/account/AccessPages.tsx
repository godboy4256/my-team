import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, TextInput } from '../../components';
import { evaluationGroups, evaluationQuestions } from '../stats/evaluation';

type User = { id: string; name: string; age: number; username: string };
type Team = {
  id: string;
  name: string;
  inviteCode: string;
  playerCount: number;
};
type MemberView = {
  team: {
    id: string;
    name: string;
    homeTown: string;
    homeGround: string;
    description: string;
  };
  player: {
    id: string;
    name: string;
    jerseyNumber: number | null;
    birthYear: number;
    preferredPositions: string[];
  };
  evaluation: Record<string, number> | null;
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
          팀 관리자는 계정으로 팀을 운영하고, 선수는 계정 없이 팀 코드와
          등번호로 자기 기록을 확인할 수 있어요.
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
            <span>초대 코드와 등번호로 본인 스탯을 확인해요.</span>
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
          navigate('/team-info', { replace: true });
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
                navigate('/team-info');
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
      navigate('/team-info');
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
  const [inviteCode, setInviteCode] = useState('');
  const [jerseyNumber, setJerseyNumber] = useState('');
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
          jerseyNumber: Number(jerseyNumber),
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
          팀 초대 코드와 팀 명단에 등록된 등번호를 입력해 주세요. 계정 가입은
          필요하지 않습니다.
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
          <TextInput
            label="등번호"
            name="jerseyNumber"
            type="number"
            min={0}
            max={99}
            value={jerseyNumber}
            onChange={(event) => setJerseyNumber(event.target.value)}
            required
          />
          {error && (
            <p className="access-error" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" className="mt-2 w-full" disabled={isSubmitting}>
            {isSubmitting ? '확인 중…' : '팀 기록 보기'}
          </Button>
        </form>
      </section>
    </PageFrame>
  );
}

function MyStatsPage() {
  const navigate = useNavigate();
  const [memberView, setMemberView] = useState<MemberView | null>(null);
  const [isLoadingSavedPlayer, setIsLoadingSavedPlayer] = useState(true);
  const [inviteCode, setInviteCode] = useState('');
  const [jerseyNumber, setJerseyNumber] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    fetch('/api/teams/member/me', { credentials: 'include' })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as MemberView;
      })
      .then((savedView) => {
        if (active && savedView) setMemberView(savedView);
      })
      .catch(() => {
        if (active) setError('저장된 기록을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (active) setIsLoadingSavedPlayer(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function findPlayer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    try {
      const response = await fetch('/api/teams/join', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inviteCode,
          jerseyNumber: Number(jerseyNumber),
        }),
      });
      if (!response.ok) throw new Error(await getErrorMessage(response));
      setMemberView((await response.json()) as MemberView);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : '선수를 찾지 못했습니다.',
      );
    }
  }

  async function clearSavedPlayer() {
    await fetch('/api/teams/member/logout', {
      method: 'POST',
      credentials: 'include',
    });
    setMemberView(null);
    setError('');
    setInviteCode('');
    setJerseyNumber('');
  }

  if (!memberView && isLoadingSavedPlayer) {
    return (
      <PageFrame>
        <section className="access-card">
          <h1 className="access-title">내 기록 확인</h1>
          <p className="access-description">
            저장된 팀 기록을 불러오고 있어요.
          </p>
        </section>
      </PageFrame>
    );
  }

  if (!memberView)
    return (
      <PageFrame>
        <section className="access-card">
          <h1 className="access-title">내 기록 확인</h1>
          <p className="access-description">
            팀 초대 코드와 등번호를 입력해 본인 기록을 확인하세요.
          </p>
          <p className="access-hint">
            한 번 확인하면 이 기기에서 다음 방문 때 자동으로 기록을 불러와요.
          </p>
          <form className="access-form" onSubmit={findPlayer}>
            <TextInput
              label="팀 초대 코드"
              name="inviteCode"
              value={inviteCode}
              onChange={(event) =>
                setInviteCode(event.target.value.toUpperCase())
              }
              required
            />
            <TextInput
              label="등번호"
              name="jerseyNumber"
              type="number"
              min={0}
              max={99}
              value={jerseyNumber}
              onChange={(event) => setJerseyNumber(event.target.value)}
              required
            />
            {error && (
              <p className="access-error" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full">
              내 스탯 보기
            </Button>
          </form>
        </section>
      </PageFrame>
    );

  const average = memberView.evaluation
    ? Object.values(memberView.evaluation).reduce(
        (sum, score) => sum + score,
        0,
      ) / Object.values(memberView.evaluation).length
    : null;
  return (
    <PageFrame>
      <section className="access-card member-dashboard">
        <button
          type="button"
          className="access-back"
          onClick={() => navigate('/welcome')}
        >
          ← MYTEAM 시작
        </button>
        <p className="access-eyebrow">{memberView.team.name}</p>
        <div className="member-profile-card">
          <span className="player-profile-avatar">
            {memberView.player.name.slice(0, 1)}
          </span>
          <div>
            <h1 className="access-title">{memberView.player.name}</h1>
            <p className="access-description">
              {memberView.player.jerseyNumber != null
                ? `#${memberView.player.jerseyNumber} · `
                : ''}
              {memberView.player.birthYear}년생
            </p>
          </div>
        </div>
        <section className="member-stats-section">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-lg font-extrabold">내 선수 스탯</h2>
              <p className="text-sm text-ink-muted">
                팀 관리자가 기록한 평가입니다.
              </p>
            </div>
            {average !== null && (
              <strong className="text-xl text-brand-800">
                {average.toFixed(1)}
                <span className="text-xs font-semibold"> / 5</span>
              </strong>
            )}
          </div>
          {!memberView.evaluation ? (
            <p className="member-empty-stats">
              아직 등록된 선수 평가가 없습니다.
            </p>
          ) : (
            evaluationGroups.map((group) => {
              const questions = evaluationQuestions.filter(
                (question) => question.group === group,
              );
              return (
                <div key={group} className="member-stat-group">
                  <h3>{group}</h3>
                  {questions.map((question) => (
                    <div key={question.id} className="member-stat-row">
                      <span>{question.label}</span>
                      <strong>
                        {memberView.evaluation?.[question.id] ?? '—'}
                        <small>점</small>
                      </strong>
                    </div>
                  ))}
                </div>
              );
            })
          )}
        </section>
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => void clearSavedPlayer()}
        >
          로그아웃
        </Button>
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
