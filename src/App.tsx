import './App.css'

function App() {
  return (
    <main>
      <header><a className="brand" href="#">한술<span>HANSUL</span></a><a href="#about">한술 소개 ↗</a></header>
      <section className="hero" aria-labelledby="title">
        <p className="eyebrow">대구 · 경북의 맛을 잇다</p>
        <h1 id="title">한 술에 담긴 맛,<br />한 세대를 잇는 이야기.</h1>
        <p className="intro">손끝으로 기억하고 말로 전해온 우리 집 조리법.<br />한술은 지역의 음식과 그 안에 담긴 이야기를 기록합니다.</p>
        <a className="button" href="#about">한술 알아보기 <span>↓</span></a>
        <div className="bowl" aria-hidden="true"><div className="food">✳</div><div className="dish" /><div className="spoon" /></div>
        <p className="caption">오래된 기억이, 새로운 한 끼로.</p>
      </section>
      <section id="about" className="about" aria-labelledby="about-title">
        <p className="eyebrow">우리의 식탁에 남길 것들</p>
        <h2 id="about-title">음식 너머의 이야기를 이어갑니다.</h2>
        <div className="cards">
          <article><span>01 / 기록</span><h3>말로 전하는 손맛</h3><p>익숙한 목소리로 들려주는 조리법을 담아냅니다.</p></article>
          <article><span>02 / 발견</span><h3>가까운 곳의 특별한 맛</h3><p>대구·경북 곳곳에 숨어 있는 지역 식문화를 만납니다.</p></article>
          <article><span>03 / 전승</span><h3>다음 세대의 한 끼</h3><p>가족의 기억이 담긴 음식을 함께 만들고 이어갑니다.</p></article>
        </div>
        <p className="notice">한술은 지금 준비 중입니다. 음성 기록과 조리법 탐색 기능은 추후 제공됩니다.</p>
      </section>
      <footer><span className="brand">한술</span><p>우리의 맛이 오래도록 이어지도록.</p></footer>
    </main>
  )
}

export default App
