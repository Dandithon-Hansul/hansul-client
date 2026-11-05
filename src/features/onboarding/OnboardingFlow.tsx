import { useState, type FormEvent } from 'react'
import './onboarding.css'

const foodChoices = ['탕·찌개·전골', '구이', '찜·조림', '볶음', '전·나물·무침', '기타']
const districts: Record<string, string[]> = {
  대구광역시: ['중구', '동구', '서구', '남구', '북구', '수성구', '달서구', '달성군', '군위군'],
  경상북도: ['포항시', '경주시', '김천시', '안동시', '구미시', '영주시', '영천시', '상주시', '문경시', '경산시', '의성군', '청송군', '영양군', '영덕군', '청도군', '고령군', '성주군', '칠곡군', '예천군', '봉화군', '울진군', '울릉군'],
}

type Props = {
  name: string
  setName: (name: string) => void
  region: string
  setRegion: (region: string) => void
  favoriteFoods: string[]
  setFavoriteFoods: (foods: string[]) => void
  step: number
  setStep: (step: number) => void
  onComplete: () => void
  onExit: () => void
}

function OnboardingFlow({ name, setName, region, setRegion, favoriteFoods, setFavoriteFoods, step, setStep, onComplete, onExit }: Props) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [regionTab, setRegionTab] = useState('대구광역시')
  const [district, setDistrict] = useState('')

  const canContinue = step === 0 ? Boolean(name.trim()) : step === 1 ? true : favoriteFoods.length > 0
  const prompts = ['어떤 이름을 사용하실 건가요?', '어느 지역에 거주하시나요?', '어떤 음식을 좋아하시나요? (최대 2개)']

  function continueFlow(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canContinue) return
    if (step < 2) setStep(step + 1)
    else onComplete()
  }

  function chooseDistrict() {
    if (!district) return
    setRegion(`${regionTab} · ${district}`)
    setSheetOpen(false)
  }

  function toggleFood(food: string) {
    if (favoriteFoods.includes(food)) setFavoriteFoods(favoriteFoods.filter((item) => item !== food))
    else if (favoriteFoods.length < 2) setFavoriteFoods([...favoriteFoods, food])
  }

  return (
    <main className="onboarding-flow">
      <div className="onboarding-progress" aria-label={`3단계 중 ${step + 1}단계`}>
        {[0, 1, 2].map((item) => <span className={item === step ? 'active' : item < step ? 'complete' : ''} key={item} />)}
      </div>
      <button className="onboarding-back" type="button" onClick={() => step === 0 ? onExit() : setStep(step - 1)} aria-label="이전">‹</button>
      <section className="onboarding-content">
        <h1>당신의 맛 이야기를<br />시작해 볼까요?</h1>
        <p className="onboarding-subtitle">한술에서 사용할 기본 정보를 입력해주세요.</p>
        <label className="onboarding-question" htmlFor={step === 0 ? 'onboarding-name' : undefined}>{prompts[step]}</label>

        {step === 0 && <input id="onboarding-name" className="onboarding-input" autoComplete="name" placeholder="이름을 입력해 주세요" value={name} onChange={(event) => setName(event.target.value)} />}

        {step === 1 && (
          <>
            <button className={`onboarding-input region-input ${region ? 'has-value' : ''}`} type="button" onClick={() => setSheetOpen(true)}>
              <span aria-hidden="true">⌕</span>{region || '지역을 설정해주세요.'}
            </button>
            {sheetOpen && <div className="region-overlay" role="presentation" onClick={() => setSheetOpen(false)}>
              <section className="region-sheet" role="dialog" aria-modal="true" aria-labelledby="region-title" onClick={(event) => event.stopPropagation()}>
                <div className="sheet-handle" />
                <button className="sheet-close" type="button" onClick={() => setSheetOpen(false)} aria-label="닫기">×</button>
                <h2 id="region-title">거주 지역을 선택해주세요</h2>
                <div className="region-tabs">{Object.keys(districts).map((item) => <button type="button" className={regionTab === item ? 'selected' : ''} key={item} onClick={() => { setRegionTab(item); setDistrict('') }}>{item}</button>)}</div>
                <div className="district-list">{districts[regionTab].map((item) => <button type="button" className={district === item ? 'selected' : ''} key={item} onClick={() => setDistrict(item)}>{item}</button>)}</div>
                <button className="sheet-confirm" type="button" disabled={!district} onClick={chooseDistrict}>선택완료</button>
              </section>
            </div>}
          </>
        )}

        {step === 2 && <div className="food-choice-grid">{foodChoices.map((food, index) => <button type="button" className={`food-choice ${favoriteFoods.includes(food) ? 'selected' : ''}`} key={food} aria-pressed={favoriteFoods.includes(food)} onClick={() => toggleFood(food)}>
          <svg viewBox="0 0 32 32" aria-hidden="true">{index % 3 === 0 ? <><path d="M5 16h22c-.5 7-4 11-11 11S5.5 23 5 16Z"/><path d="M10 11c-2-2 1-3 0-5m6 5c-2-2 1-3 0-5m6 5c-2-2 1-3 0-5"/></> : index % 3 === 1 ? <><path d="M5 17h22c-.5 6-4 9-11 9S5.5 23 5 17Z"/><path d="M8 13c4 2 12 2 16 0M12 9v3m8-3v3"/></> : <><path d="M6 15h20c-.5 8-3.5 12-10 12S6.5 23 6 15Z"/><path d="M9 12c3 1 11 1 14 0m-7-3v3"/></>}</svg>
          <span>{food}</span>
        </button>)}</div>}
      </section>

      <form className="onboarding-bottom" onSubmit={continueFlow}>
        <button type="submit" disabled={!canContinue}>{step === 2 ? '한술 시작하기' : step === 1 && !region ? '건너뛰기' : '다음'}</button>
      </form>
    </main>
  )
}

export default OnboardingFlow
