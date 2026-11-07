import { useLocation, useNavigate } from 'react-router'

/**
 * "‹" 뒤로가기: 앱 안에서 이동해 왔으면 이전 화면, 주소로 바로 들어왔으면 fallback 으로
 * (location.key 가 'default' 면 이 탭에서 처음 연 화면)
 */
export function useGoBack(fallback = '/') {
  const navigate = useNavigate()
  const location = useLocation()
  return () => {
    if (location.key !== 'default') navigate(-1)
    else navigate(fallback, { replace: true })
  }
}
