// 지도 화면용 가짜 데이터 (VITE_USE_MOCK=true). 백엔드 데모 시드가 들어오기 전까지 빈 지도 대신 사용
import type { MapRecipe } from '../api/map'
import { MOCK_DELAY_MS } from '../env'

export const mockDelay = () => new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS))

type Entry = { region: string; recipes: MapRecipe[] }

let seq = 0
const recipe = (title: string, transmitter: string, likes: number, saves: number, image: string | null = null): MapRecipe => ({
  recipe_id: `map-${String(++seq).padStart(3, '0')}`,
  title,
  hero_image_url: image,
  transmitter_name: transmitter,
  like_count: likes,
  save_count: saves,
})

/** 지역 코드 → 그 지역의 공개 레시피. 레시피가 없는 지역도 넣어서 빈 상태를 확인할 수 있게 함 */
export const MOCK_MAP_RECIPES: Record<string, Entry> = {
  '27000': {
    region: '대구광역시',
    recipes: [
      recipe('대구식 육개장', '박순덕', 162, 102, '/images/daegu-yukgaejang.png'),
      recipe('납작만두', '이말순', 88, 41),
      recipe('동인동 찜갈비', '김영자', 120, 76),
      recipe('따로국밥', '최복희', 64, 30),
    ],
  },
  '47110': { region: '포항시', recipes: [recipe('포항 물회', '정옥순', 97, 55), recipe('과메기 쌈', '한봉녀', 45, 22)] },
  '47130': { region: '경주시', recipes: [recipe('경주 쌈밥', '서정자', 51, 27)] },
  '47150': { region: '김천시', recipes: [] },
  '47170': {
    region: '안동시',
    recipes: [
      recipe('안동 찜닭', '김한술', 204, 133, '/images/andong-jjimdak.png'),
      recipe('헛제삿밥', '권말분', 77, 49),
      recipe('간고등어 조림', '류순이', 69, 38),
      recipe('건진국수', '김복례', 40, 18),
    ],
  },
  '47190': { region: '구미시', recipes: [] },
  '47210': { region: '영주시', recipes: [recipe('영주 묵밥', '장분이', 33, 15)] },
  '47230': { region: '영천시', recipes: [recipe('돔배기 산적', '박금자', 58, 31)] },
  '47250': { region: '상주시', recipes: [] },
  '47280': { region: '문경시', recipes: [recipe('약돌돼지 고추장구이', '윤정희', 42, 20)] },
  '47290': { region: '경산시', recipes: [] },
  '47730': { region: '의성군', recipes: [recipe('의성 마늘 닭백숙', '오순자', 36, 19)] },
  '47750': { region: '청송군', recipes: [recipe('약수 닭백숙', '신옥자', 29, 12)] },
  '47760': { region: '영양군', recipes: [] },
  '47770': { region: '영덕군', recipes: [recipe('영덕 대게찜', '조말자', 110, 64), recipe('물가자미 식해', '배순남', 25, 11)] },
  '47820': { region: '청도군', recipes: [recipe('청도 추어탕', '임춘자', 47, 23)] },
  '47830': { region: '고령군', recipes: [] },
  '47840': { region: '성주군', recipes: [] },
  '47850': { region: '칠곡군', recipes: [] },
  '47900': { region: '예천군', recipes: [recipe('용궁 순대', '황분례', 38, 17)] },
  '47920': { region: '봉화군', recipes: [] },
  '47930': { region: '울진군', recipes: [recipe('울진 대게 비빔밥', '남숙희', 31, 14)] },
  '47940': { region: '울릉군', recipes: [recipe('홍합밥', '문옥분', 74, 46), recipe('따개비 칼국수', '강순례', 26, 10)] },
}
