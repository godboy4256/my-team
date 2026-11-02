# 마이팀 (My Team)

조기축구팀 관리와 경기 진행을 돕는 반응형 웹 앱입니다.

## 기술 구성

- `apps/web`: React, TypeScript, Vite, Tailwind CSS
- `apps/api`: NestJS, TypeScript, TypeORM, MySQL
- npm workspaces 모노레포

## 시작하기

요구 사항: Node.js 20 이상, npm. 로컬 MySQL을 쓰거나 Docker가 설치되어 있다면 Compose로 개발 DB를 실행하세요.

```sh
npm install
cp .env.example .env
npm run db:up       # 선택: Docker 개발 DB
npm run dev
```

- 웹: <http://localhost:3000>
- API: <http://localhost:3001/api>
- API 상태 확인: <http://localhost:3001/api/health>

DB 없이 웹 화면과 API 상태 확인을 개발할 수 있습니다. MySQL 연결은 환경 변수를 설정하면 활성화됩니다. `synchronize`는 개발 환경에서만 허용되며, 프로덕션 스키마 변경은 마이그레이션으로 관리해야 합니다.

## 유용한 명령

```sh
npm run dev:web
npm run dev:api
npm run typecheck
npm run build
npm run lint
npm run format:check
npm run check
npm run db:down
```

ESLint checks TypeScript and React hooks rules. Prettier uses an 80-character print width and is the single source of formatting. Run `npm run format` before committing changes.

## AI 작업 지침

`AGENTS.md`에는 AI 코딩 도구가 따라야 할 프로젝트 구조, 코드 스타일, 보안 기준, 검증 절차가 정리되어 있습니다. 작업 전 이 파일을 읽고, 변경 후 `npm run check`를 실행하세요. Codex는 저장소 루트의 `AGENTS.md`를 프로젝트 작업 지침으로 자동 참조합니다.
