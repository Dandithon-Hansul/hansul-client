import { useCallback, useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router'
import { useGoBack } from '../../app/useGoBack'
import Avatar from '../../components/Avatar'
import { PinIcon } from '../../components/icons'
import { ApiError } from '../../lib/api/client'
import { getUserProfile, getUserRecipes } from '../../lib/api/profile'
import type { PublicProfile } from '../../lib/api/types'
import { formatRegion } from '../../lib/regions'
import { useAuth } from '../auth/auth-context'
import RecipeGrid from './RecipeGrid'
import { errorText } from './useMyProfile'
import './profile.css'

/**
 * 다른 사용자(전승자) 프로필 — /users/:id
 * 레시피 상세에서 전승자 이름을 누르면 여기로 (완료 기준: 프로필 편집 버튼 없음)
 */
function UserProfilePage() {
  const { id = '' } = useParams()
  const { session } = useAuth()
  const goBack = useGoBack('/')
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [error, setError] = useState<unknown>(null)

  useEffect(() => {
    let alive = true
    getUserProfile(id)
      .then((loaded) => {
        if (alive) setProfile(loaded)
      })
      .catch((caught: unknown) => {
        if (alive) setError(caught)
      })
    return () => {
      alive = false
    }
  }, [id])

  const fetchRecipes = useCallback((cursor: string | null) => getUserRecipes(id, cursor), [id])

  // 내 id 면 편집 기능이 있는 마이페이지로
  if (session?.userId === id) return <Navigate to="/profile" replace />

  const notFound = error instanceof ApiError && error.status === 404

  return (
    <main className="profile-page">
      <h1 className="sr-only">{profile ? `${profile.display_name}님의 프로필` : '전승자 프로필'}</h1>
      <header className="profile-topbar">
        <button type="button" className="profile-back" onClick={goBack} aria-label="뒤로">‹</button>
      </header>

      {error ? (
        <div className="profile-message"><p>{notFound ? '프로필을 찾을 수 없어요.' : errorText(error)}</p></div>
      ) : (
        <>
          <section className="user-head">
            {profile ? <Avatar src={profile.avatar_url} size={76} alt={`${profile.display_name} 프로필 사진`} /> : <span className="avatar is-skeleton" style={{ width: 76, height: 76 }} />}
            <dl className="user-stats">
              <div><dt>전승한 레시피</dt><dd>{profile?.stats.transmitted_recipes ?? 0}</dd></div>
              <div><dt>받은 좋아요 수</dt><dd>{profile?.stats.likes_received ?? 0}</dd></div>
            </dl>
          </section>

          <section className="user-intro">
            {profile && (
              <>
                <p className="user-name">
                  {profile.display_name}
                  {profile.region && <span><PinIcon className="user-pin" />{formatRegion(profile.region)}</span>}
                </p>
                {profile.bio && <p className="user-bio">{profile.bio}</p>}
              </>
            )}
          </section>

          <h2 className="user-section-title">전승한 레시피</h2>
          <section className="profile-tab-panel">
            <RecipeGrid fetcher={fetchRecipes} empty={<div className="profile-message"><p>아직 전승한 레시피가 없어요.</p></div>} />
          </section>
        </>
      )}
    </main>
  )
}

export default UserProfilePage
