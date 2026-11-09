import { useCallback, useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router'
import { useGoBack } from '../../app/useGoBack'
import Avatar from '../../components/Avatar'
import { ApiError } from '../../lib/api/client'
import { getUserProfile } from '../../lib/api/profile'
import type { PublicProfile } from '../../lib/api/types'
import { formatRegion } from '../../lib/regions'
import { useAuth } from '../auth/auth-context'
import RecipeGrid from './RecipeGrid'
import { errorText } from './useMyProfile'
import './profile.css'

type LoadState = { id: string; profile?: PublicProfile; error?: unknown }

/**
 * 다른 사용자(전승자) 프로필 — /users/:id
 * 디자인 결정: "프로필 편집" 버튼만 없는 마이페이지와 같은 모양
 * GET /api/profiles/:id 한 번으로 프로필·숫자·전승한 레시피를 받음.
 * 저장한 레시피 수·목록은 본인만 볼 수 있어서(명세서) 숫자 2개 + "전승한 레시피" 탭만 보여줌
 */
function UserProfilePage() {
  const { id = '' } = useParams()
  const { session } = useAuth()
  const goBack = useGoBack('/')
  const [state, setState] = useState<LoadState | null>(null)
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    const request = { alive: true }
    getUserProfile(id)
      .then((profile) => request.alive && setState({ id, profile }))
      .catch((error: unknown) => request.alive && setState({ id, error }))
    return () => {
      request.alive = false
    }
  }, [id, retry])

  const current = state?.id === id ? state : null
  const profile = current?.profile ?? null
  // 레시피는 프로필 응답에 같이 오므로 그대로 그리드에 넘김 (다음 페이지 없음)
  const fetchRecipes = useCallback(async () => ({ items: profile?.recipes ?? [], nextCursor: null }), [profile])

  // 내 id 면 편집 기능이 있는 마이페이지로
  if (session?.userId === id) return <Navigate to="/profile" replace />

  const error = current?.error
  const notFound = error instanceof ApiError && error.status === 404
  const region = profile ? (profile.region ? formatRegion(profile.region) : profile.region_text ?? '지역 미설정') : ''

  return (
    <main className="profile-page">
      <h1 className="sr-only">{profile ? `${profile.display_name}님의 프로필` : '전승자 프로필'}</h1>
      <header className="profile-topbar">
        <button type="button" className="profile-back" onClick={goBack} aria-label="뒤로">‹</button>
      </header>

      <section className="profile-head">
        {!profile ? (
          <>
            <span className="avatar is-skeleton" style={{ width: 56, height: 56 }} />
            <div className="profile-head-text"><span className="skeleton-line w-24" /><span className="skeleton-line w-32" /></div>
          </>
        ) : (
          <>
            <Avatar src={profile.avatar_url} size={56} alt={`${profile.display_name} 프로필 사진`} />
            <div className="profile-head-text">
              <p className="profile-name">{profile.display_name}</p>
              <p className="profile-region">{region}</p>
            </div>
          </>
        )}
      </section>
      {profile?.bio && <p className="profile-bio">{profile.bio}</p>}

      {error ? (
        <div className="profile-message">
          <p>{notFound ? '프로필을 찾을 수 없어요.' : errorText(error)}</p>
          {!notFound && <button type="button" onClick={() => setRetry((n) => n + 1)}>다시 불러오기</button>}
        </div>
      ) : (
        <>
          <dl className="profile-stats is-two">
            <div><dt>전승한 레시피</dt><dd>{profile?.stats.transmitted_recipes ?? 0}</dd></div>
            <div><dt>받은 좋아요 수</dt><dd>{profile?.stats.likes_received ?? 0}</dd></div>
          </dl>

          <div className="profile-tab-list" role="tablist">
            <button type="button" role="tab" aria-selected="true" className="selected">전승한 레시피</button>
          </div>

          <section className="profile-tab-panel" role="tabpanel">
            {profile && (
              <RecipeGrid
                key={profile.id}
                fetcher={fetchRecipes}
                empty={<div className="profile-message"><p>아직 전승한 레시피가 없어요.</p></div>}
              />
            )}
          </section>
        </>
      )}
    </main>
  )
}

export default UserProfilePage
