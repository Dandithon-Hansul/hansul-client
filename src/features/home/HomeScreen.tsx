import './home.css'

type HomeScreenProps = {
  name: string
  onNavigate: (destination: 'home' | 'record' | 'map' | 'profile' | 'monthly' | 'recipe') => void
}

function SearchIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></svg>
}

function HomeScreen({ name, onNavigate }: HomeScreenProps) {
  return (
    <div className="home-page">
      <header className="home-header">
        <a className="home-brand" href="/" onClick={(event) => { event.preventDefault(); onNavigate('home') }} aria-label="한술 홈">
          <img src="/logo.svg" alt="" />
          <span>한술</span>
        </a>
        <button className="profile-shortcut" type="button" aria-label="프로필" onClick={() => onNavigate('profile')}>
          <svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="15" fill="currentColor"/><circle cx="16" cy="11.5" r="5" fill="white"/><path d="M6.5 26c1.4-5 4.7-7.5 9.5-7.5s8.1 2.5 9.5 7.5" fill="white"/></svg>
        </button>
      </header>

      <section className="home-intro">
        <h1>오늘은 어떤 맛의 기억을<br />이어볼까요?</h1>
        <label className="recipe-search">
          <span className="visually-hidden">음식 또는 지역 검색</span>
          <input type="search" placeholder="음식을 검색해 보세요" />
          <SearchIcon />
        </label>
      </section>

      <button className="record-promo" type="button" onClick={() => onNavigate('record')}>
        <span className="record-promo-title">우리 집 손맛을<br />목소리로 남겨보세요</span>
        <span className="record-promo-link">전승 시작하기 <span aria-hidden="true">→</span></span>
        <svg className="sound-mark" viewBox="0 0 74 74" aria-hidden="true"><path d="M11 42V30m12 25V20m12 32V13m12 39V24m12 24V31"/><path d="M62 13v12m-6-6h12"/></svg>
      </button>

      <section className="recipe-section monthly-section">
        <button className="section-heading" type="button" onClick={() => onNavigate('monthly')}>
          <span>이달의 전승 음식</span><span className="section-arrow" aria-hidden="true">›</span>
        </button>
        <button className="recipe-feature" type="button" onClick={() => onNavigate('recipe')}>
          <img src="/images/andong-jjimdak.png" alt="당면과 채소를 곁들인 안동 찜닭" />
          <span className="recipe-gradient" />
          <span className="recipe-title">01 안동 찜닭</span>
        </button>
      </section>

      <section className="recipe-section recommendation-section">
        <h2>{name || '김한술'}님을 위한 추천 음식</h2>
        <button className="recipe-feature recommendation-card" type="button" onClick={() => onNavigate('recipe')}>
          <img src="/images/daegu-yukgaejang.png" alt="대구식 육개장" />
          <span className="recipe-gradient" />
          <span className="recipe-location">대구 향토음식</span>
          <span className="recipe-title">대구식 육개장</span>
        </button>
      </section>

      <nav className="home-bottom-nav" aria-label="하단 메뉴">
        <div className="home-nav-pills">
          <button className="home-nav-button is-active" type="button" aria-label="홈" onClick={() => onNavigate('home')}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10.5 12 3l9 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-4.8v-6h-5.4v6H4.5A1.5 1.5 0 0 1 3 19.5z" fill="currentColor"/></svg>
          </button>
          <button className="home-nav-button" type="button" aria-label="지역 지도" onClick={() => onNavigate('map')}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s7-6.4 7-12a7 7 0 1 0-14 0c0 5.6 7 12 7 12Z"/><circle cx="12" cy="9" r="2.2"/></svg>
          </button>
        </div>
        <button className="home-record-button" type="button" aria-label="음성 기록하기" onClick={() => onNavigate('record')}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3m-4 0h8"/></svg>
        </button>
      </nav>
    </div>
  )
}

export default HomeScreen
