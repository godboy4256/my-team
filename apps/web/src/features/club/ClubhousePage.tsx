import { useNavigate } from 'react-router-dom';

type ClubhousePageProps = {
  name: string;
  emblem: string;
  homeTown: string;
  description: string;
  playerCount: number;
  evaluatedCount: number;
  hiddenStatCount: number;
};

export function ClubhousePage({
  name,
  emblem,
  homeTown,
  description,
  playerCount,
  evaluatedCount,
  hiddenStatCount,
}: ClubhousePageProps) {
  const navigate = useNavigate();

  return (
    <section className="team-management-page clubhouse-page styled-scrollbar">
      <div className="clubhouse-page-content">
        <div className="clubhouse-titlebar">
          <button
            className="clubhouse-edit-link"
            type="button"
            onClick={() => navigate('/team-info')}
          >
            클럽 정보 관리 <span aria-hidden="true">↗</span>
          </button>
        </div>

        <div className="clubhouse-desktop-grid">
          <section
            className="clubhouse-scene"
            aria-label={`${name} 클럽하우스 공간`}
          >
            <svg
              className="clubhouse-blank-room"
              viewBox="0 0 1200 800"
              preserveAspectRatio="xMidYMid slice"
              role="img"
              aria-label="아직 가구와 장식이 배치되지 않은 아이소메트릭 클럽하우스"
            >
              <defs>
                <linearGradient
                  id="clubhouse-wall-left"
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="1"
                >
                  <stop stopColor="#d9d8c2" />
                  <stop offset="1" stopColor="#aaa994" />
                </linearGradient>
                <linearGradient
                  id="clubhouse-wall-right"
                  x1="0"
                  y1="0"
                  x2="1"
                  y2="1"
                >
                  <stop stopColor="#c8c8b2" />
                  <stop offset="1" stopColor="#929581" />
                </linearGradient>
                <linearGradient
                  id="clubhouse-floor"
                  x1="0"
                  y1="0"
                  x2="0.8"
                  y2="1"
                >
                  <stop stopColor="#a79c7c" />
                  <stop offset="1" stopColor="#756d58" />
                </linearGradient>
                <pattern
                  id="clubhouse-floor-grid"
                  width="64"
                  height="48"
                  patternUnits="userSpaceOnUse"
                  patternTransform="skewY(-27)"
                >
                  <path
                    d="M64 0H0V48"
                    fill="none"
                    stroke="#f3e6c5"
                    strokeOpacity=".12"
                    strokeWidth="2"
                  />
                </pattern>
              </defs>
              <rect width="1200" height="800" fill="#78816f" />
              <path d="M80 330 600 55 1120 330 600 605Z" fill="#3e5944" />
              <path
                d="M80 330 600 55V380L80 655Z"
                fill="url(#clubhouse-wall-left)"
              />
              <path
                d="M600 55 1120 330V655L600 380Z"
                fill="url(#clubhouse-wall-right)"
              />
              <path
                d="m80 655 520-275 520 275-520 275Z"
                fill="url(#clubhouse-floor)"
              />
              <path
                d="m80 655 520-275 520 275-520 275Z"
                fill="url(#clubhouse-floor-grid)"
              />
              <path
                d="m80 642 520-275 520 275"
                fill="none"
                stroke="#53644c"
                strokeWidth="13"
              />
              <path
                d="m600 380 0 550M80 655l520 275 520-275"
                fill="none"
                stroke="#f4e4bd"
                strokeOpacity=".1"
                strokeWidth="3"
              />
              <path
                d="M80 330 600 55 1120 330"
                fill="none"
                stroke="#f1e8c9"
                strokeOpacity=".28"
                strokeWidth="5"
              />
            </svg>

            <header className="clubhouse-team-card">
              <span className="clubhouse-crest" aria-hidden="true">
                {emblem || '⚽'}
              </span>
              <div className="clubhouse-team-copy">
                <span className="clubhouse-card-kicker">
                  AMATEUR FOOTBALL CLUB
                </span>
                <h2>{name || '우리 팀'}</h2>
                <p>
                  {homeTown || '우리 팀의 홈 베이스'}
                  {description ? ` · ${description}` : ''}
                </p>
              </div>
              <span className="clubhouse-open-badge">
                <i /> 운영 중
              </span>
            </header>

            {/*
            <div className="clubhouse-scene-caption">
              <span>우리 팀이 쉬고, 이야기하고, 다음 경기를 준비하는 공간</span>
              <span>배경·캐릭터 아트는 교체 가능한 슬롯으로 구성</span>
            </div> */}
          </section>

          <aside className="clubhouse-side-column">
            <section className="clubhouse-panel club-status-panel">
              <div className="clubhouse-panel-heading">
                <div>
                  <span className="clubhouse-card-kicker">SQUAD STATUS</span>
                  <h2>클럽 현황</h2>
                </div>
                <span className="clubhouse-panel-icon" aria-hidden="true">
                  ✦
                </span>
              </div>
              <div className="clubhouse-stat-grid">
                <div>
                  <span>등록 선수</span>
                  <strong>
                    {playerCount}
                    <small>명</small>
                  </strong>
                </div>
                <div>
                  <span>평가 완료</span>
                  <strong>
                    {evaluatedCount}
                    <small>명</small>
                  </strong>
                </div>
                <div>
                  <span>특성 발견</span>
                  <strong>
                    {hiddenStatCount}
                    <small>명</small>
                  </strong>
                </div>
              </div>
              <div className="clubhouse-progress-copy">
                <span>선수단 기록 정리</span>
                <strong>
                  {playerCount
                    ? Math.round((evaluatedCount / playerCount) * 100)
                    : 0}
                  %
                </strong>
              </div>
              <div
                className="clubhouse-progress-track"
                role="progressbar"
                aria-label="선수단 기록 정리"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={
                  playerCount
                    ? Math.round((evaluatedCount / playerCount) * 100)
                    : 0
                }
              >
                <span
                  style={{
                    width: `${playerCount ? Math.round((evaluatedCount / playerCount) * 100) : 0}%`,
                  }}
                />
              </div>
            </section>

            <section className="clubhouse-panel clubhouse-action-panel">
              <div className="clubhouse-panel-heading">
                <div>
                  <span className="clubhouse-card-kicker">CLUB OPERATIONS</span>
                  <h2>운영 스테이션</h2>
                </div>
                <span className="clubhouse-panel-icon" aria-hidden="true">
                  ⌘
                </span>
              </div>
              <button
                type="button"
                className="clubhouse-action-row"
                onClick={() => navigate('/board')}
              >
                <span className="clubhouse-action-symbol">▦</span>
                <span>
                  <strong>미팅룸</strong>
                  <small>전술 구성과 라인업 준비</small>
                </span>
                <b aria-hidden="true">›</b>
              </button>
              <button
                type="button"
                className="clubhouse-action-row"
                onClick={() => navigate('/team')}
              >
                <span className="clubhouse-action-symbol">♙</span>
                <span>
                  <strong>스카우트실</strong>
                  <small>선수단과 평가 관리</small>
                </span>
                <b aria-hidden="true">›</b>
              </button>
              <button
                type="button"
                className="clubhouse-action-row"
                onClick={() => navigate('/team-info')}
              >
                <span className="clubhouse-action-symbol">⌂</span>
                <span>
                  <strong>구단 사무국</strong>
                  <small>팀 정보와 초대 링크</small>
                </span>
                <b aria-hidden="true">›</b>
              </button>
            </section>

            <section className="clubhouse-note-panel">
              <span className="clubhouse-note-mark" aria-hidden="true">
                ✧
              </span>
              <p>
                <strong>오늘도 팀을 위해 한 걸음</strong>
                <span>운영 기록이 쌓이면 이 공간도 함께 채워집니다.</span>
              </p>
            </section>
          </aside>
        </div>
      </div>
    </section>
  );
}
