# hansul-client

대구·경북의 지역 음식과 가정에서 전해 내려오는 조리법을 AI 음성 대화로 기록하고, 누구나 쉽게 찾아보고 따라 만들 수 있도록 돕는 지역 식문화 전승 서비

## Team

## 프론트 - 깃 규칙

### ① 브랜치 명명 규칙 (Branch Naming)

`작업타입/구현내용` 형태로 통일하면 브랜치 목록만 봐도 무슨 작업 중인지 한눈에 보입니다.

- **`feature/login-page`**: 새로운 기능 개발
- **`fix/header-responsive`**: 버그 수정
- **`refactor/api-hooks`**: 리팩토링 (기능 변경 없이 코드 개선)
- **`style/theme-color`**: CSS/디자인 단독 수정
- **`chore/package-update`**: 패키지 설치, 빌드 설정 등

---

### ② 커밋 메시지 컨벤션 (Conventional Commits)

프론트엔드는 UI 수정과 로직 수정을 구분하는 것이 코드 리뷰할 때 정말 큰 도움이 됩니다.

| Prefix          | 설명                         | 예시                                           |
| --------------- | ---------------------------- | ---------------------------------------------- |
| **`feat:`**     | 새로운 기능 추가             | `feat: 로그인 폼 유효성 검사 로직 추가`        |
| **`fix:`**      | 버그 수정                    | `fix: 모바일 화면에서 드롭다운 깨짐 현상 수정` |
| **`style:`**    | UI/스타일 수정 (기능 변화 X) | `style: 메인 페이지 버튼 색상 변경`            |
| **`refactor:`** | 코드 리팩토링                | `refactor: Custom Hook 분리로 컴포넌트 단순화` |
| **`chore:`**    | 설정 파일, 패키지 관리 등    | `chore: tailwind.config.js 스페이싱 속성 추가` |

> 💡 **하나의 의미 있는 단위**로 올리기.

---

### ③ 브랜치 전략 및 머지 규칙 (Git Flow & Merge Strategy)

안정적인 협업과 배포 관리를 위해 기본적으로 **`develop` 브랜치를 중심**으로 개발을 진행하며, 최종 배포 단계에서 `main` 브랜치로 병합합니다.

#### 1. 브랜치 구조 및 흐름

```text
[개인 작업 브랜치 (feature/*, fix/*)]
        │
        ▼ (PR & Merge)
   [develop]  ───▶ 통합 테스트 및 기능 검증
        │
        ▼ (최종 배포 시 Merge)
    [main]    ───▶ 실 서비스 배포 (Production)

```

#### 2. 머지 가이드라인

- **기능 개발 / 작업 단계**
- `develop` 브랜치에서 최신 코드를 받아 개인 작업 브랜치(`feature/기능명`, `fix/수정내용` 등)를 생성합니다.
- 모든 작업이 완료되면 `main`이 아닌 `develop` 브랜치를 대상(Base)으로 Pull Request(PR)를 생성합니다.

- **통합 및 테스트 단계**
- 코드 리뷰 또는 팀원 승인 후 `develop` 브랜치에 병합(Merge)합니다.
- 병합된 기능들은 `develop` 브랜치에서 충돌 여부 및 동작을 함께 확인합니다.

- **최종 배포 단계**
- 모든 기능 구현과 테스트가 완료된 후, 안정성이 검증된 **`develop` 브랜치를 `main` 브랜치로 최종 병합**하여 배포합니다.

---

#### 💡 머지 시 체크포인트

1. **충돌 해결:** PR 생성 전 로컬 `develop`의 최신 내용을 작업 브랜치에 pull/rebase하여 충돌이 없는지 확인합니다.
2. **PR 템플릿/설명:** 작업 내용 요약, 변경 사항, 테스트 결과(캡처본 등)를 간단히 남깁니다.
3. **브랜치 정리:** `develop`에 머지 완료된 개인 작업 브랜치는 삭제하여 브랜치 목록을 깔끔하게 유지합니다.

## 개발 환경

Node.js 24 LTS와 npm을 사용합니다. React + TypeScript + Vite 기반입니다.

```sh
npm ci
cp .env.example .env.local   # 처음 한 번
npm run dev -- --host 0.0.0.0
```

- `npm run build`: TypeScript 검사 및 프로덕션 빌드 (`dist/`)
- `npm run lint`: Oxlint 정적 검사
- `npm test`: Vitest 자동 테스트 (`npm run test:watch` 는 저장할 때마다 다시 실행)
- `npm run preview -- --host 0.0.0.0`: 빌드 결과 확인

### 환경 변수 (`.env.local`)

| 이름 | 설명 |
| --- | --- |
| `VITE_USE_MOCK` | `true` 면 Supabase·백엔드 없이 브라우저 안 가짜 데이터로 실행 |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Supabase 대시보드 › Project Settings › API |
| `VITE_AUTH_EMAIL_DOMAIN` | 아이디 → 이메일 변환용 도메인 (기본 `hansul.app`) |
| `VITE_API_BASE_URL` | 배포된 백엔드 주소. 비우면 같은 주소의 `/api` |
| `VITE_API_PROXY_TARGET` | 개발 중 `/api` 를 넘겨줄 로컬 백엔드 (예: `http://localhost:3000`) |

### 화면 주소

| 주소 | 화면 | 로그인 필요 |
| --- | --- | --- |
| `/login`, `/signup` | 로그인, 회원가입 | 로그인 상태면 홈(또는 온보딩)으로 이동 |
| `/onboarding` | 온보딩 3단계 | O |
| `/` | 홈 | O |
| `/profile` (`?tab=saved`) | 마이페이지 (나의 레시피 / 저장한 맛) | O |
| `/profile/edit` | 프로필 편집 (사진·이름·거주지역, 로그아웃) | O |
| `/users/:id` | 다른 사용자(전승자) 프로필 — mock 예시 `/users/u-kim-hansul` | O |
| `/record` `/chat` `/recipe` `/cook` `/monthly` `/map` | 기존 화면 | O |

기존 컴포넌트의 `onNavigate('record')` 호출은 그대로 쓰면 되고, `App.tsx` 에서 주소로 바꿔 이동합니다.

### 로그인 테스트

**mock 모드** (`VITE_USE_MOCK=true`): 데모 계정 `hansul` / `hansul123` 은 프로필이 있어 로그인하면 홈으로, 새로 가입한 계정은 프로필이 없어 온보딩으로 갑니다. 가짜 데이터 초기화는 개발자 도구 콘솔에서 `localStorage.removeItem('hansul.mock.db')`.

**실제 Supabase** (`VITE_USE_MOCK=false`): Supabase 대시보드 › Authentication › Sign In / Providers › Email 에서 **Confirm email 을 꺼야** 가입 즉시 로그인됩니다 (아이디를 가짜 이메일로 바꿔 쓰기 때문). 가입한 사용자는 Authentication › Users 에 `아이디@hansul.app` 으로 보입니다. 백엔드 `/api/profiles/me` 가 아직 없으면 로그인 후 홈으로 갑니다.

### 백엔드에 요청할 것 (프로필)

- `GET /api/profiles/:id`, `GET /api/profiles/:id/recipes` — 다른 사용자 프로필 (명세서에 없음), 소개글 `bio` 컬럼
- 프로필 사진: Supabase Storage `avatars` 공개 버킷 + 본인 폴더(`{user_id}/`)만 업로드 허용 정책. 프론트가 직접 올리고 주소를 `PATCH /api/profiles/me` 의 `avatar_url` 로 보냄
- 거주지역은 `region_code`(행정코드 5자리, 예: 안동시 `47170`)로 보냄 — 목록은 `src/lib/regions.ts`
