import { useState, type FormEvent } from 'react'
import './post-onboarding.css'

export type FeaturePage = 'record' | 'chat' | 'map' | 'profile' | 'monthly' | 'recipe' | 'cook'

type Props = { page: FeaturePage; name: string; region: string; favoriteFoods: string[]; onNavigate: (page: 'home' | FeaturePage) => void; onLogout?: () => void }

const cookingSteps = [
  { title: '재료 손질하기', body: '소고기는 키친타월로 핏물을 닦고, 무와 대파는 먹기 좋은 크기로 썰어주세요.' },
  { title: '소고기 볶기', body: '냄비에 참기름을 두르고 소고기를 넣어 겉면이 익을 때까지 볶아주세요.' },
  { title: '무 넣고 끓이기', body: '무와 물을 넣고 끓이면서 떠오르는 거품을 걷어내 주세요.' },
  { title: '고춧가루 넣고 끓이기', body: '고춧가루와 대파를 넣고 약불에서 재료가 부드러워질 때까지 끓여요.' },
]

function PageHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return <header className="feature-header"><button type="button" onClick={onBack} aria-label="뒤로">‹</button><h1>{title}</h1><span /></header>
}

function PostOnboardingScreens({ page, name, region, favoriteFoods, onNavigate, onLogout }: Props) {
  const [recording, setRecording] = useState(false)
  const [chatIndex, setChatIndex] = useState(0)
  const [draft, setDraft] = useState('')
  const [messages, setMessages] = useState<Array<{ from: 'ai' | 'user'; text: string }>>([
    { from: 'ai', text: '오늘은 어떤 음식의 이야기를 남겨볼까요?' },
  ])
  const [mapRegion, setMapRegion] = useState('대구광역시')
  const [cookStep, setCookStep] = useState(0)
  const suggestions = [
    ['안동 찜닭', '대구식 육개장', '소고기 뭇국'],
    ['어릴 때 먹던 맛이에요', '가족 모임 때 만들어요', '직접 이야기할게요'],
    ['할머니에게 배웠어요', '명절마다 만들어요', '우리 집만의 비법이 있어요'],
  ]

  function answer(text: string) {
    const next = chatIndex + 1
    setMessages((current) => [...current, { from: 'user', text }, { from: 'ai', text: next >= 3 ? '소중한 기억이네요. 이제 레시피로 정리해 볼게요.' : ['그 음식은 누구와 함께 드셨나요?', '그 음식에 꼭 들어가는 재료가 있나요?'][Math.min(next - 1, 1)] }])
    setChatIndex(next)
  }

  function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft.trim()) return
    answer(draft.trim())
    setDraft('')
  }

  if (page === 'record') return (
    <main className="feature-page">
      <PageHeader title="AI 음성 기록" onBack={() => onNavigate('home')} />
      <div className="record-view">
        <p className="feature-kicker">우리 집 손맛 기록</p>
        <h2>{recording ? '이야기를 듣고 있어요' : '음식 이야기를\n들려주세요'}</h2>
        <p className="feature-muted">{recording ? '편하게 말씀해 주세요. 녹음은 이 기기에서만 진행돼요.' : '버튼을 눌러 가족의 음식 이야기를 시작해 보세요.'}</p>
        <button className={`record-orb ${recording ? 'is-recording' : ''}`} type="button" onClick={() => setRecording((value) => !value)} aria-label={recording ? '녹음 일시정지' : '녹음 시작'}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3m-4 0h8"/></svg>
        </button>
        <p className="record-status">{recording ? '녹음 중 · 00:12' : '마이크 버튼을 눌러 이야기를 시작하세요'}</p>
        <label className="photo-upload">음식 사진 추가하기<input type="file" accept="image/*" /></label>
        <button className="feature-primary" type="button" onClick={() => onNavigate('chat')}>이야기 마치고 다음으로 <span>→</span></button>
      </div>
    </main>
  )

  if (page === 'chat') return (
    <main className="feature-page chat-page">
      <PageHeader title="음식 이야기" onBack={() => onNavigate('record')} />
      <div className="chat-context"><span>AI 음성 기록</span><h2>어떤 음식의 이야기를<br />남겨볼까요?</h2></div>
      <div className="chat-messages" aria-live="polite">
        {messages.map((message, index) => <div className={`chat-bubble ${message.from}`} key={`${index}-${message.text}`}>{message.from === 'ai' && <img src="/logo.svg" alt="한술" />}<p>{message.text}</p></div>)}
      </div>
      {chatIndex < 3 && <div className="answer-options">{suggestions[Math.min(chatIndex, 2)].map((suggestion) => <button type="button" key={suggestion} onClick={() => answer(suggestion)}>{suggestion}</button>)}</div>}
      <form className="chat-compose" onSubmit={sendMessage}><input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="메시지를 입력해 주세요" aria-label="메시지" /><button type="submit" aria-label="전송">➤</button></form>
      {chatIndex >= 2 && <button className="feature-primary chat-next" type="button" onClick={() => onNavigate('recipe')}>레시피 만들러 가기 <span>→</span></button>}
    </main>
  )

  if (page === 'recipe') return (
    <main className="feature-page recipe-page">
      <PageHeader title="레시피 상세" onBack={() => onNavigate('home')} />
      <img className="recipe-detail-image" src="/images/daegu-yukgaejang.png" alt="대구식 육개장" />
      <div className="recipe-detail-content"><p className="feature-kicker">대구 향토음식 · 전승 레시피</p><h2>대구식 육개장</h2><p className="feature-muted">김한술 전승자 · 대구광역시</p><div className="recipe-stats"><span>♡ 162</span><span>◉ 102</span><span>조리 시간 40분</span></div><h3>우리 집 손맛을 담은 레시피</h3><p>소고기와 대파를 넉넉히 넣고 얼큰하게 끓이는 대구식 육개장입니다.</p><button className="feature-primary" type="button" onClick={() => { setCookStep(0); onNavigate('cook') }}>단계별로 따라 만들기 <span>→</span></button></div>
    </main>
  )

  if (page === 'cook') {
    const step = cookingSteps[cookStep]
    return <main className="feature-page cook-page"><PageHeader title={`대구식 육개장 · ${cookStep + 1}단계`} onBack={() => onNavigate('recipe')} /><div className="cook-progress"><span style={{ width: `${((cookStep + 1) / cookingSteps.length) * 100}%` }} /></div><p className="feature-kicker">{cookStep + 1} / {cookingSteps.length} 단계</p><h2>{step.title}</h2><img className="cook-image" src={cookStep === 0 ? '/images/andong-jjimdak.png' : '/images/daegu-yukgaejang.png'} alt="조리 재료" /><p className="cook-description">{step.body}</p><div className="cook-ai-tip">✦ 한술의 팁<br /><span>재료의 크기를 비슷하게 맞추면 고르게 익어요.</span></div><div className="cook-controls">{cookStep > 0 && <button type="button" onClick={() => setCookStep((stepIndex) => stepIndex - 1)}>이전 단계</button>}<button className="feature-primary" type="button" onClick={() => cookStep === cookingSteps.length - 1 ? onNavigate('home') : setCookStep((stepIndex) => stepIndex + 1)}>{cookStep === cookingSteps.length - 1 ? '요리 끝내기' : '다음 단계'} <span>→</span></button></div></main>
  }

  if (page === 'monthly') return (
    <main className="feature-page"><PageHeader title="이달의 전승 음식 TOP 6" onBack={() => onNavigate('home')} /><div className="food-list">{[
      ['01', '안동 찜닭', '안동시 · 김한술 전승자', '/images/andong-jjimdak.png'],
      ['02', '대구식 육개장', '대구광역시 · 박순덕 전승자', '/images/daegu-yukgaejang.png'],
      ['03', '소고기 뭇국', '경상북도 · 이정희 전승자', '/images/daegu-yukgaejang.png'],
    ].map(([rank, title, subtitle, image]) => <button className="food-list-card" type="button" key={rank} onClick={() => onNavigate('recipe')}><img src={image} alt="" /><span><b>{rank} {title}</b><small>{subtitle}</small></span><span>›</span></button>)}</div></main>
  )

  if (page === 'map') return (
    <main className="feature-page"><PageHeader title="지역의 맛 지도" onBack={() => onNavigate('home')} /><div className="map-intro"><p className="feature-kicker">전승 음식 지도</p><h2>우리 동네의 맛을<br />찾아보세요</h2></div><div className="region-switch">{['대구광역시', '경상북도'].map((item) => <button className={mapRegion === item ? 'selected' : ''} type="button" key={item} onClick={() => setMapRegion(item)}>{item}</button>)}</div><div className="map-illustration"><div className="map-region">{mapRegion}<span>전승 음식</span><b>안동 찜닭</b><small>대구식 육개장</small></div></div><button className="feature-primary" type="button" onClick={() => onNavigate('monthly')}>{mapRegion} 인기 레시피 보기 <span>→</span></button></main>
  )

  return (
    <main className="feature-page"><PageHeader title="마이페이지" onBack={() => onNavigate('home')} /><div className="profile-summary"><div className="profile-avatar">{(name || '한술').slice(0, 1)}</div><h2>{name || '한술'}님</h2><p>{region || '지역 미설정'} · 음식 이야기 기록자</p></div><div className="profile-stats"><span><b>2</b>전승 레시피</span><span><b>8</b>저장한 맛</span><span><b>34</b>받은 좋아요</span></div><div className="profile-tabs"><button type="button">나의 레시피</button><button type="button">저장한 맛</button></div><div className="profile-foods">관심 음식 {favoriteFoods.map((food) => <span key={food}>{food}</span>)}</div><button className="feature-primary" type="button" onClick={() => onNavigate('record')}>우리 집 음식 기록하기 <span>→</span></button>{onLogout && <button className="profile-logout" type="button" onClick={onLogout}>로그아웃</button>}</main>
  )
}

export default PostOnboardingScreens
