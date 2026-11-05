import { useState } from 'react'
import { districtColumnsOf, findRegionByCode, regionLabel, SIDO_NAMES, type RegionOption, type SidoName } from '../../lib/regions'
import { CloseIcon } from '../icons'
import './region-sheet.css'

type Props = {
  /** 지금 선택돼 있는 지역 코드 (없으면 null) */
  value: string | null
  onClose: () => void
  onConfirm: (region: RegionOption) => void
}

/**
 * 거주 지역 선택 바텀시트 — Figma 최종 디자인 기준 (온보딩·프로필 편집 공용)
 * 시·도 탭 → 경북은 "시 / 군" 두 열 목록, 대구는 '대구광역시' 한 줄. 고른 곳은 굵게 + 밑줄, "선택완료"로 확정
 * 부모에서 {open && <RegionSheet …/>} 로 렌더 (열 때마다 현재 값으로 시작)
 */
function RegionSheet({ value, onClose, onConfirm }: Props) {
  const current = findRegionByCode(value)
  const [tab, setTab] = useState<SidoName>((current?.sido as SidoName | undefined) ?? '대구광역시')
  const [selected, setSelected] = useState<RegionOption | null>(current ?? null)

  return (
    <div className="region-overlay" role="presentation" onClick={onClose}>
      <section className="region-sheet" role="dialog" aria-modal="true" aria-label="거주 지역 선택" onClick={(event) => event.stopPropagation()}>
        <button className="sheet-close" type="button" onClick={onClose} aria-label="닫기"><CloseIcon /></button>

        <div className="region-tabs" role="tablist">
          {SIDO_NAMES.map((sido) => (
            <button type="button" role="tab" aria-selected={tab === sido} className={tab === sido ? 'selected' : ''} key={sido} onClick={() => setTab(sido)}>{sido}</button>
          ))}
        </div>

        <div className="district-columns">
          {districtColumnsOf(tab).map((column) => (
            <div className="district-column" key={column.label ?? 'all'}>
              {column.label && <p className="district-column-label">{column.label}</p>}
              <ul>
                {column.items.map((region) => {
                  const isSelected = selected?.code === region.code
                  return (
                    <li key={region.code}>
                      <button type="button" className={isSelected ? 'selected' : ''} aria-pressed={isSelected} onClick={() => setSelected(region)}>{regionLabel(region)}</button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>

        <button className="sheet-confirm" type="button" disabled={!selected} onClick={() => selected && onConfirm(selected)}>선택완료</button>
      </section>
    </div>
  )
}

export default RegionSheet
