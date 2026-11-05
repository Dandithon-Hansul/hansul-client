import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { resetProfileStatus } from '../lib/api/profileStatus'

// 테스트끼리 영향을 주지 않도록 매번 화면과 저장소를 비움
afterEach(() => {
  cleanup()
  window.localStorage.clear()
  window.sessionStorage.clear()
  resetProfileStatus()
})
