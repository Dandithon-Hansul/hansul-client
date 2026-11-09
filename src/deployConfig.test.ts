import { describe, expect, it } from 'vitest'
import raw from '../vercel.json?raw'

type Rewrite = { source: string; destination: string }
const { rewrites } = JSON.parse(raw) as { rewrites: Rewrite[] }

describe('Vercel 배포 설정 (vercel.json)', () => {
  it('/api 요청은 index.html 로 보내기 전에 백엔드로 넘긴다', () => {
    // 순서가 바뀌면 /api/profiles/me 가 index.html(HTML)을 받아 로그인 직후 'INVALID_RESPONSE · 200' 으로 막힘
    const api = rewrites.findIndex((rule) => rule.source === '/api/:path*')
    const spa = rewrites.findIndex((rule) => rule.destination === '/index.html')
    expect(api).toBeGreaterThanOrEqual(0)
    expect(rewrites[api].destination).toBe('https://hansul-server.vercel.app/api/:path*')
    expect(api).toBeLessThan(spa)
  })

  it('/map, /profile 같은 주소에서 새로고침해도 앱이 뜨게 나머지는 index.html', () => {
    expect(rewrites.at(-1)).toEqual({ source: '/(.*)', destination: '/index.html' })
  })
})
