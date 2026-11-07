import { useLocation } from 'react-router'

/** 현재 주소를 화면에 찍어서 "어디로 이동했는지" 검사 */
function CurrentPath() {
  const location = useLocation()
  return <output data-testid="path">{location.pathname + location.search}</output>
}

export default CurrentPath
