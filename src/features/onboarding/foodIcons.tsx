// 온보딩 음식 카테고리 아이콘 — Figma 아이콘을 보고 비슷하게 그린 임시 SVG.
// 디자이너에게 SVG 로 받으면 이 파일의 path 만 바꾸면 됨. (색은 CSS 의 currentColor)
import type { ReactNode } from 'react'

const steam = (xs: number[], wavy: boolean) =>
  xs.map((x) => (
    <path key={x} d={wavy ? `M${x} 11c-1.6-1.6 1.6-2.4 0-4.4` : `M${x} 11V7.5`} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  ))

export const FOOD_ICONS: Record<string, ReactNode> = {
  // 냄비 + 국자 + 김
  '탕·찌개·전골': (
    <>
      {steam([12, 16, 20], true)}
      <path d="M5 14.5h22v1.5h1.5a1 1 0 0 1 0 2H27v5a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4v-5H3.5a1 1 0 0 1 0-2H5Z" />
      <path d="M21.5 6.5 17 17.5a3 3 0 1 1-2-.8l4.6-10.9" fill="none" stroke="#fffefd" strokeWidth="1.4" strokeLinecap="round" />
    </>
  ),
  // 프라이팬 + 연기
  구이: (
    <>
      {steam([11, 14.5, 18], false)}
      <path d="M4 15.5h19v2.5a6 6 0 0 1-6 6h-7a6 6 0 0 1-6-6Z" />
      <path d="M22.5 17.5 29 14.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </>
  ),
  // 뚜껑 있는 찜솥
  '찜·조림': (
    <>
      <rect x="13.5" y="5" width="5" height="2.5" rx="1.2" />
      <path d="M6.5 11.5a9.5 3.6 0 0 1 19 0Z" />
      <path d="M6 12.5h20v1.5h1.6a1 1 0 0 1 0 2H26v7a4.5 4.5 0 0 1-4.5 4.5h-11A4.5 4.5 0 0 1 6 23v-7H4.4a1 1 0 0 1 0-2H6Z" />
    </>
  ),
  // 손잡이 냄비 + 김 (볶음)
  볶음: (
    <>
      {steam([9, 13, 17], true)}
      <path d="M4 14.5h17V22a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4Z" />
      <path d="M20.5 16.5 29 13.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </>
  ),
  // 나물 담긴 접시
  '전·나물·무침': (
    <>
      <path d="M11.5 15c-1.8-2-1.6-5 .6-6.4 1.6-1 3.6-.3 4.2 1.3l-2.4 1.6c1.4.4 2.2 1.6 2 3.5Z" />
      <ellipse cx="20" cy="17" rx="6" ry="3.2" />
      <path d="M4.5 18.5h23c-.4 4.3-3.9 7.5-8.3 7.5h-6.4c-4.4 0-7.9-3.2-8.3-7.5Z" />
    </>
  ),
  기타: (
    <>
      <circle cx="10" cy="16" r="1.7" />
      <circle cx="16" cy="16" r="1.7" />
      <circle cx="22" cy="16" r="1.7" />
    </>
  ),
}
