import { PersonIcon } from './icons'

/** 프로필 사진. 없으면 목업처럼 회녹색 원 + 사람 아이콘 (스타일은 features/profile/profile.css) */
function Avatar({ src, size, alt = '' }: { src: string | null | undefined; size: number; alt?: string }) {
  return (
    <span className="avatar" style={{ width: size, height: size }}>
      {src ? <img src={src} alt={alt} /> : <PersonIcon className="avatar-placeholder" />}
    </span>
  )
}

export default Avatar
