# API 연결 현황 (2026-11-08)

첨부된 API 명세서 v0.1과 현재 프론트엔드 구현을 대조한 결과입니다. 이 문서는 저장소 코드와 목업 구현을 기준으로 하며, 백엔드 서버 동작 여부는 확인하지 않았습니다.

## 요약

- 명세서 전체 25개 엔드포인트 중 프론트에서 호출하는 것은 7개입니다: 프로필 조회/수정, 프로필 설정, 홈 피드, 검색, 내 레시피 목록, 저장 목록.
- 이 중 프로필 설정은 온보딩 담당 영역이므로 구현 상태만 기록했습니다. 해당 코드는 변경하지 않았습니다.
- 레시피 탐색·홈·검색·상세·좋아요/저장·지도·기록·평가 등 주요 기능은 명세 API에 연결되어 있지 않습니다. 화면이 있는 경우에도 정적 예시 또는 목업 화면입니다.
- `GET /api/profiles/:id`와 `GET /api/profiles/:id/recipes`는 명세에 없지만 코드에서 호출합니다. 백엔드와 계약을 확인해야 합니다.

## 연결된 항목

| 엔드포인트 | 상태 | 근거 |
|---|---|---|
| `GET /api/profiles/me` | 연결됨 | `src/lib/api/profile.ts`의 `getMyProfile` |
| `PATCH /api/profiles/me` | 연결됨 | `src/lib/api/profile.ts`의 `updateMyProfile` |
| `POST /api/profiles/setup` | 연결됨 (담당 제외) | `src/lib/api/profile.ts`의 `setupProfile` |
| `GET /api/home` | 연결됨 | `src/lib/api/home.ts`의 `getHomeFeed`; 홈에서 TOP 및 추천 카드 렌더링 |
| `GET /api/search/recipes` | 연결됨 | `src/lib/api/home.ts`의 `searchRecipes`; 홈 검색 입력에서 제출 시 호출 |
| `GET /api/profiles/me/recipes` | 연결됨 | `src/lib/api/profile.ts`의 `getMyRecipes` |
| `GET /api/profiles/me/saved` | 연결됨 | `src/lib/api/profile.ts`의 `getMySaved` |

공통 요청 계층은 `src/lib/api/client.ts`에 있으며 Supabase access token을 Bearer 헤더로 전달하고 공통 JSON 오류를 `ApiError`로 변환합니다. 목록 응답은 `recipes`와 `items` 둘 다 정규화합니다.

## 미연결 항목

| 엔드포인트 | 상태 / 확인 사항 |
|---|---|
| `POST /api/uploads/sign` | 미연결. 아바타 업로드는 `src/lib/storage.ts`에서 Supabase Storage 직접 업로드를 사용합니다. |
| `POST /api/stt` | 미연결. 음성 녹음/전사 API 호출을 찾지 못했습니다. |
| `POST /api/analyze` | 미연결. 레시피 구조화 API 호출을 찾지 못했습니다. |
| `POST /api/chat` | 미연결. 채팅 화면은 로컬 상태 기반 예시입니다. |
| `POST /api/recipes` | 미연결. 레시피 생성 요청을 찾지 못했습니다. |
| `POST /api/recipes/:id/voice` | 미연결. |
| `GET /api/recipes` | 미연결. 레시피 목록은 정적 데이터/목업입니다. |
| `GET /api/recipes/:id` | 미연결. 상세 화면은 하드코딩된 예시입니다. |
| `POST /api/recipes/:id/like` | 미연결. |
| `POST /api/recipes/:id/save` | 미연결. |
| `POST /api/evaluate` | 미연결. |
| `POST /api/steps/images` | 미연결. |
| `POST /api/steps/:order/image` | 미연결. |
| `POST /api/steps/:order/photo` | 미연결. |
| `POST /api/sensory/vectorize` | 미연결. |
| `GET /api/recommendations` | 미연결. 홈 추천 카드는 정적 예시입니다. |
| `GET /api/map/regions` | 미연결 (담당 제외). |
| `GET /api/map/regions/:region_code/recipes` | 미연결 (담당 제외). |

## 명세 외 호출

| 경로 | 현재 호출 위치 | 조치 |
|---|---|---|
| `GET /api/profiles/:id` | `src/lib/api/profile.ts`의 `getUserProfile` | 백엔드 명세에 추가하거나 UI/API 사용 여부를 담당자와 확인 |
| `GET /api/profiles/:id/recipes` | `src/lib/api/profile.ts`의 `getUserRecipes` | 백엔드 명세에 추가하거나 UI/API 사용 여부를 담당자와 확인 |

## 우선 연결 후보 (담당 범위 내)

1. `GET /api/home` 및 `GET /api/search/recipes`를 홈 피드/검색에 연결합니다.
2. `GET /api/recipes`와 `GET /api/recipes/:id`, 좋아요·저장 토글을 탐색/상세 경험에 연결합니다.
3. 전승 기록 API 묶음(`/uploads/sign`, `/stt`, `/analyze`, `/chat`, `/recipes`, voice, step images)을 별도 기능 단위로 연결합니다.
4. `POST /api/evaluate`와 `POST /api/sensory/vectorize`, `GET /api/recommendations`를 해당 화면/기능이 구현되는 시점에 연결합니다.
5. 백엔드와 명세에 없는 타 사용자 프로필 API의 계약을 확정합니다.

위 순서는 화면/UI가 이미 완성됐다는 뜻은 아닙니다. 미구현 UI가 있는 경우 API 연결과 함께 화면 구현도 필요합니다.
