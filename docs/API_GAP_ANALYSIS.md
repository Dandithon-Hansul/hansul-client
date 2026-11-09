# API 연결 현황 (2026-11-09)

최신 첨부 명세서(`docs/API_SPEC.md`, v0.1)를 프론트엔드 호출과 대조했습니다. 코드가 API를 호출한다는 사실과 실제 백엔드 연결 성공은 별개입니다. `VITE_USE_MOCK=true`인 동안에는 목업 데이터가 표시됩니다.

## 명세에서 확인되는 연결

| 기능 / 엔드포인트 | 프론트엔드 위치 |
|---|---|
| `GET /api/home`, `GET /api/search/recipes` | `src/lib/api/home.ts` |
| `POST /api/uploads/sign`, `POST /api/stt`, `POST /api/analyze`, `POST /api/chat` | `src/lib/api/recipes.ts`의 음성 기록·채팅 흐름 |
| `POST /api/recipes`, `GET /api/recipes`, `GET /api/recipes/:id` | 레시피 발행·목록·상세 |
| `POST /api/recipes/:id/like`, `POST /api/recipes/:id/save` | 레시피 상세 |
| `POST /api/steps/images` | 조리 단계 이미지 생성 |
| `POST /api/sensory/vectorize` | 손맛 프로파일 갱신 |
| `GET /api/profiles/me/recipes`, `GET /api/profiles/me/saved` | 내 프로필 레시피·저장 목록 |
| `GET /api/recommendations` | 홈 추천 fallback |
| `GET /api/map/regions`, `GET /api/map/regions/:region_code/recipes` | 지도 기능 (별도 담당 영역) |
| `GET /api/profiles/me`, `PATCH /api/profiles/me`, `POST /api/profiles/setup` | 프로필·온보딩 (별도 담당 영역) |

## 최신 명세와 계약 확인이 필요한 호출

| 엔드포인트 / 필드 | 확인 사항 |
|---|---|
| `POST /api/recipes/:id/voice` | 프론트에서 전승 음성 업로드 용도로 호출하지만 최신 첨부 명세에 없음 |
| `POST /api/evaluate` | 조리 후 맛 평가에 호출하지만 최신 첨부 명세에 없음 |
| `POST /api/steps/:order/image`, `POST /api/steps/:order/photo` | 이미지 재생성·완성 사진 연결에 호출하지만 최신 첨부 명세에 없음 |
| 레시피 상세 응답의 `transmitter_id` | 전승자 프로필 `/users/{transmitter_id}` 링크가 사용합니다. 최신 상세 응답 예시에 필드가 없어 백엔드 응답 포함 여부를 확인해야 합니다. |
| `GET /api/profiles/:id`, `GET /api/profiles/:id/recipes` | 공개 프로필 화면에서 사용하는 경로로 최신 첨부 명세에 없음 |

## 참고

- 최신 명세의 온보딩 완료 `start_route`는 `/`입니다. 역할에 따른 경로 분기 등 기존 코드와 다른 계약은 담당자 확인이 필요합니다.
- 채팅 요청은 현재 `tts: false`로 보내며 SSE 텍스트를 표시합니다. 오디오 이벤트 재생은 연결되지 않았습니다.
- 맛 평가 화면은 기본 평가값을 제출하며, 세부 평가 항목 입력 UI는 보완이 필요합니다.
- 공통 JSON 요청은 `src/lib/api/client.ts`가 Supabase access token을 Bearer 헤더로 전달합니다.
