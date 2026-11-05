// 프로필 화면에서 쓰는 작은 아이콘들 (기존 화면처럼 인라인 SVG)

export function PersonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8.5" r="3.8" />
      <path d="M4.5 20c.9-3.6 3.8-5.6 7.5-5.6s6.6 2 7.5 5.6" />
    </svg>
  )
}

export function PinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 22s7-6.4 7-12a7 7 0 1 0-14 0c0 5.6 7 12 7 12Z" fill="currentColor" />
      <circle cx="12" cy="10" r="2.6" fill="#fff" />
    </svg>
  )
}

export function BowlIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 16h22c-.5 7-4 11-11 11S5.5 23 5 16Z" />
      <path d="M10 11c-2-2 1-3 0-5m6 5c-2-2 1-3 0-5m6 5c-2-2 1-3 0-5" />
    </svg>
  )
}

/** Figma 의 얇은 "<" 뒤로가기 */
export function BackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M15.5 4 7.5 12l8 8" />
    </svg>
  )
}

/** 시트 닫기 "×" */
export function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <path d="M5 5l14 14M19 5 5 19" />
    </svg>
  )
}

/** 지역 입력칸 돋보기 */
export function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.5 15.5 5 5" />
    </svg>
  )
}
