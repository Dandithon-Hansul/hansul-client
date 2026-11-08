# API 연결 현황 (2026-11-08)

첨부된 API 명세서 v0.1과 현재 프론트엔드 코드를 대조한 결과입니다. 프론트 코드의 호출 경로 연결 상태를 말하며, 백엔드 서버 연결 여부는 URL 설정과 실제 서버 응답으로 별도 확인해야 합니다.

## 연결된 항목

| 엔드포인트 | 호출 위치 |
|---|---|
| `GET /api/profiles/me`, `PATCH /api/profiles/me` | `src/lib/api/profile.ts`의 프로필 조회·수정 |
| `POST /api/profiles/setup` | 이미 연결됨 (온보딩 담당 영역, 코드 수정 안 함) |
| `GET /api/home`, `GET /api/search/recipes` | `src/lib/api/home.ts`; 홈 피드 및 검색 제출 |
| `GET /api/recommendations` | 홈 추천 카드; 통합 피드의 추천 목록을 fallback으로 사용 |
| `POST /api/uploads/sign` | `src/lib/api/recipes.ts`; 기록 음성·채팅 사진·전승 음성·조리 완성 사진 업로드 |
| `POST /api/stt`, `/api/analyze`, `/api/chat` | 기록 전사, 분석, SSE 채팅 흐름 |
| `POST /api/recipes`, `POST /api/recipes/:id/voice` | 초안 발행 및 전승자 음성 업로드 |
| `GET /api/recipes`, `GET /api/recipes/:id` | 월간 인기 목록, 상세 및 조리 화면 |
| `POST /api/recipes/:id/like`, `/save` | 레시피 상세의 좋아요·저장 동작 |
| `POST /api/evaluate` | 조리 마지막 단계의 맛 평가; SSE 텍스트 처리 |
| `POST /api/steps/images`, `/api/steps/:order/image`, `/photo` | 조리 화면의 이미지 생성·재생성·완성 사진 연결 |
| `POST /api/sensory/vectorize` | 기록 화면의 손맛 프로파일 업데이트 버튼 |
| `GET /api/profiles/me/recipes`, `/api/profiles/me/saved` | 내 프로필 레시피·저장 목록 |

공통 JSON 요청은 `src/lib/api/client.ts`를 사용하며 Supabase access token을 Bearer 헤더로 전달합니다. 채팅·평가 SSE는 `src/lib/api/recipes.ts`에서 스트림으로 처리합니다.

## 미연결 / 별도 확인

| 엔드포인트 | 상태 |
|---|---|
| `GET /api/map/regions` | 미연결 (지도 담당 범위) |
| `GET /api/map/regions/:region_code/recipes` | 미연결 (지도 담당 범위) |
| `GET /api/profiles/:id`, `/api/profiles/:id/recipes` | 명세 외 경로를 코드에서 호출 중. 백엔드와 계약 확인 필요 |

## 동작 및 확인 메모

- `VITE_USE_MOCK=true`이면 목업 결과를 표시하고 서버 요청을 보내지 않습니다.
- 실제 백엔드 연결은 `VITE_USE_MOCK=false`와 유효한 `VITE_API_BASE_URL` 또는 `/api` 개발 프록시가 필요합니다.
- 채팅은 현재 `tts: false`로 보내며 SSE 텍스트를 표시합니다. audio 이벤트의 음성 재생은 아직 연결하지 않았습니다.
- 맛 평가 UI는 현재 고정된 기본 평가값을 제출합니다. 세부 평가 항목 입력 UI는 별도 보완이 필요합니다.
