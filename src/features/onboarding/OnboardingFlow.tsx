import { useState, type FormEvent } from 'react'
import { BackIcon, SearchIcon } from '../../components/icons'
import RegionSheet from '../../components/region/RegionSheet'
import { findRegionByCode } from '../../lib/regions'
import { FOOD_ICONS } from './foodIcons'
import './onboarding.css'

const foodChoices = ['탕·찌개·전골', '구이', '찜·조림', '볶음', '전·나물·무침', '기타']
const FOOD_MAX = 2 // Figma: 복수선택 최대 2개

type Props = {
  name: string
  setName: (name: string) => void
  /** 거주 지역 행정코드 (예: 안동시 47170). 건너뛰면 '' */
  regionCode: string
  setRegionCode: (code: string) => void
  favoriteFoods: string[]
  setFavoriteFoods: (foods: string[]) => void
  step: number
  setStep: (step: number) => void
  onComplete: () => void
}

/** [S-01] 온보딩 3단계 — Figma 최종 디자인 기준 */
function OnboardingFlow({ name, setName, regionCode, setRegionCode, favoriteFoods, setFavoriteFoods, step, setStep, onComplete }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const region = findRegionByCode(regionCode)

  // 1단계: 이름 필수 / 2단계: 지역은 건너뛰기 가능 (Figma) / 3단계: 음식 1개 이상
  const canContinue = step === 0 ? Boolean(name.trim()) : step === 1 ? true : favoriteFoods.length > 0
  const isSkip = step === 1 && !region

  function continueFlow(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canContinue) return
    if (step < 2) setStep(step + 1)
    else onComplete()
  }

  function toggleFood(food: string) {
    if (favoriteFoods.includes(food)) setFavoriteFoods(favoriteFoods.filter((item) => item !== food))
    else if (favoriteFoods.length < FOOD_MAX) setFavoriteFoods([...favoriteFoods, food])
  }

  return (
    <main className="onboarding-flow">
      <div className="onboarding-progress" role="progressbar" aria-valuemin={1} aria-valuemax={3} aria-valuenow={step + 1} aria-label={`3단계 중 ${step + 1}단계`}>
        {[0, 1, 2].map((item) => <span className={item === step ? 'active' : ''} key={item} />)}
      </div>
      {/* Figma: 1단계에는 뒤로가기 없음 */}
      {step > 0 && <button className="onboarding-back" type="button" onClick={() => setStep(step - 1)} aria-label="이전"><BackIcon /></button>}

      <section className="onboarding-content">
        <h1>당신의 맛 이야기를<br />시작해 볼까요?</h1>
        <p className="onboarding-subtitle">한술에서 사용할 기본 정보를 입력해주세요.</p>

        {step === 0 && (
          <>
            <label className="onboarding-question" htmlFor="onboarding-name">어떤 이름을 사용하실 건가요?</label>
            <input id="onboarding-name" className="onboarding-input" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} />
          </>
        )}

        {step === 1 && (
          <>
            <p className="onboarding-question">어느 지역에 거주하시나요?</p>
            <button className={`onboarding-input region-input ${region ? 'has-value' : ''}`} type="button" onClick={() => setSheetOpen(true)} aria-haspopup="dialog">
              {region ? region.sigungu : <><SearchIcon className="region-input-icon" />지역을 설정해주세요.</>}
            </button>
            {sheetOpen && (
              <RegionSheet
                value={regionCode || null}
                onClose={() => setSheetOpen(false)}
                onConfirm={(selected) => {
                  setRegionCode(selected.code)
                  setSheetOpen(false)
                }}
              />
            )}
          </>
        )}

        {step === 2 && (
          <>
            <p className="onboarding-question">어떤 음식을 좋아하시나요? <small>(복수선택 최대 {FOOD_MAX}개)</small></p>
            <div className="food-choice-grid">
              {foodChoices.map((food) => {
                const selected = favoriteFoods.includes(food)
                return (
                  <button type="button" className={`food-choice ${selected ? 'selected' : ''}`} key={food} aria-pressed={selected} onClick={() => toggleFood(food)}>
                    <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">{FOOD_ICONS[food]}</svg>
                    <span>{food}</span>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </section>

      <form className="onboarding-bottom" onSubmit={continueFlow}>
        <button type="submit" className={isSkip ? 'is-skip' : ''} disabled={!canContinue}>
          {step === 2 ? '한술 시작하기' : isSkip ? '건너뛰기' : '다음'}
        </button>
      </form>
    </main>
  )
}

export default OnboardingFlow
