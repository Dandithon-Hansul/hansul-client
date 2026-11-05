/** 기존 App.tsx 의 스플래시 마크업을 그대로 옮김 (스타일은 App.css 의 .splash) */
function Splash() {
  return (
    <section className="splash" aria-label="한술 시작 화면">
      <div className="splash-brand">
        <span className="splash-mark-frame"><img className="splash-mark" src="/logo.svg" alt="" /></span>
        <span>한술</span>
      </div>
    </section>
  )
}

export default Splash
