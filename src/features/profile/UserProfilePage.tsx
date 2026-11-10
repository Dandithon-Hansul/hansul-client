import { useCallback, useEffect, useState } from 'react'
import { Navigate, useParams, useSearchParams } from 'react-router'
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
type Tab = 'mine' | 'saved'
// 디자인(Figma): 마이페이지와 같은 탭 이름
const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'mine', label: '나의 레시피' },
  { key: 'saved', label: '저장한 맛' },
]

/**
 * 다른 사용자(전승자) 프로필 — /users/:id
 * 디자인 결정: "프로필 편집" 버튼만 없는 마이페이지와 같은 모양
 * GET /api/profiles/:id 한 번으로 프로필·숫자 3개·전승한 레시피·저장한 맛을 받음
 * (백엔드 ADR-006: 저장 목록은 기본 공개, 게시·공개 레시피만)
 */
function UserProfilePage() {
  const { id = '' } = useParams()
  const { session } = useAuth()
  const goBack = useGoBack('/')
  const [searchParams, setSearchParams] = useSearchParams()
  // 탭을 주소(?tab=saved)에 두면 레시피 상세에서 뒤로 와도 보던 탭이 유지됨 (마이페이지와 같은 방식)
  const tab: Tab = searchParams.get('tab') === 'saved' ? 'saved' : 'mine'
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
  // 레시피·저장한 맛은 프로필 응답에 같이 오므로 그대로 그리드에 넘김 (다음 페이지 없음)
  const fetchRecipes = useCallback(async () => ({ items: profile?.recipes ?? [], nextCursor: null }), [profile])
  const fetchSaved = useCallback(async () => ({ items: profile?.saved_recipes ?? [], nextCursor: null }), [profile])

  // 내 id 면 편집 기능이 있는 마이페이지로
  if (session?.userId === id) return <Navigate to="/profile" replace />

  const error = current?.error
  // 400(ID 형식 오류)·404 는 다시 불러와도 같은 결과라 '찾을 수 없어요' 로 안내하고 다시 시도 버튼은 숨김
  const notFound = error instanceof ApiError && (error.status === 404 || error.status === 400)
  const region = profile ? (profile.region ? formatRegion(profile.region) : profile.region_text ?? '지역 미설정') : ''

  return (
    <main className="profile-page">
      <h1 className="sr-only">{profile ? `${profile.display_name}님의 프로필` : '전승자 프로필'}</h1>
      <header className="profile-topbar">
        <button type="button" className="profile-back" onClick={goBack} aria-label="뒤로">‹</button>
      </header>

      {!error && <section className="profile-head">
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
      </section>}
      {profile?.bio && <p className="profile-bio">{profile.bio}</p>}

      {error ? (
        <div className="profile-message">
          <p>{notFound ? '프로필을 찾을 수 없어요.' : errorText(error)}</p>
          {!notFound && <button type="button" onClick={() => setRetry((n) => n + 1)}>다시 불러오기</button>}
        </div>
      ) : (
        <>
          <dl className="profile-stats">
            <div><dt>전승한 레시피</dt><dd>{profile?.stats.transmitted_recipes ?? 0}</dd></div>
            <div><dt>저장한 레시피</dt><dd>{profile?.stats.saved_recipes ?? 0}</dd></div>
            <div><dt>받은 좋아요 수</dt><dd>{profile?.stats.likes_received ?? 0}</dd></div>
          </dl>

          <div className="profile-tab-list" role="tablist">
            {TABS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={tab === key}
                className={tab === key ? 'selected' : ''}
                onClick={() => setSearchParams(key === 'mine' ? {} : { tab: key }, { replace: true })}
              >
                {label}
              </button>
            ))}
          </div>

          <section className="profile-tab-panel" role="tabpanel">
            {profile && (tab === 'mine' ? (
              <RecipeGrid
                key={`${profile.id}-mine`}
                fetcher={fetchRecipes}
                empty={<div className="profile-message"><p>아직 전승한 레시피가 없어요.</p></div>}
              />
            ) : (
              <RecipeGrid
                key={`${profile.id}-saved`}
                fetcher={fetchSaved}
                empty={<div className="profile-message"><p>아직 저장한 레시피가 없어요.</p></div>}
              />
            ))}
          </section>
        </>
      )}
    </main>
  )
}

export default UserProfilePage
