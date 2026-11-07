import { useEffect, useState } from 'react'

export const SPLASH_MS = 3000
const SEEN_KEY = 'hansul.splashSeen'

function alreadySeen() {
  try {
    return window.sessionStorage.getItem(SEEN_KEY) === '1'
  } catch {
    return false
  }
}

function markSeen() {
  try {
    window.sessionStorage.setItem(SEEN_KEY, '1')
  } catch {
    /* 무시 */
  }
}

/**
 * 앱을 처음 열었을 때만 스플래시를 ms 동안 보여줌.
 * 같은 탭에서 새로고침할 때는 다시 기다리지 않도록 sessionStorage 에 기록.
 */
export function useSplash(ms = SPLASH_MS) {
  const [visible, setVisible] = useState(() => ms > 0 && !alreadySeen())

  useEffect(() => {
    if (!visible) return
    const timer = window.setTimeout(() => {
      markSeen()
      setVisible(false)
    }, ms)
    return () => window.clearTimeout(timer)
  }, [visible, ms])

  return visible
}
