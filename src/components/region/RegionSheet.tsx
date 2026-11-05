import { useState } from 'react'
import { districtsOf, findRegionByCode, SIDO_NAMES, type RegionOption, type SidoName } from '../../lib/regions'
import './region-sheet.css'

type Props = {
  /** 지금 선택돼 있는 지역 코드 (없으면 null) */
  value: string | null
  onClose: () => void
  onConfirm: (region: RegionOption) => void
}

/**
 * 거주 지역 선택 바텀시트 — 기존 OnboardingFlow 안에 있던 마크업·스타일을 그대로 분리.
 * 온보딩과 프로필 편집에서 같이 씀. 열 때는 부모가 {open && <RegionSheet …/>} 로 렌더.
 */
function RegionSheet({ value, onClose, onConfirm }: Props) {
  const current = findRegionByCode(value)
  const [tab, setTab] = useState<SidoName>((current?.sido as SidoName | undefined) ?? '대구광역시')
  const [selected, setSelected] = useState<RegionOption | null>(current ?? null)

  return (
    <div className="region-overlay" role="presentation" onClick={onClose}>
      <section className="region-sheet" role="dialog" aria-modal="true" aria-labelledby="region-title" onClick={(event) => event.stopPropagation()}>
        <div className="sheet-handle" />
        <button className="sheet-close" type="button" onClick={onClose} aria-label="닫기">×</button>
        <h2 id="region-title">거주 지역을 선택해주세요</h2>
        <div className="region-tabs">
          {SIDO_NAMES.map((sido) => (
            <button type="button" className={tab === sido ? 'selected' : ''} key={sido} onClick={() => { setTab(sido); setSelected(null) }}>{sido}</button>
          ))}
        </div>
        <div className="district-list">
          {districtsOf(tab).map((region) => (
            <button type="button" className={selected?.code === region.code ? 'selected' : ''} key={region.code} aria-pressed={selected?.code === region.code} onClick={() => setSelected(region)}>{region.sigungu}</button>
          ))}
        </div>
        <button className="sheet-confirm" type="button" disabled={!selected} onClick={() => selected && onConfirm(selected)}>선택완료</button>
      </section>
    </div>
  )
}

export default RegionSheet
