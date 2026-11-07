import { Link, useSearchParams } from 'react-router'
import { useGoBack } from '../../app/useGoBack'
import Avatar from '../../components/Avatar'
import { getMyRecipes, getMySaved } from '../../lib/api/profile'
import { formatRegion } from '../../lib/regions'
import RecipeGrid from './RecipeGrid'
import { errorText, useMyProfile } from './useMyProfile'
import './profile.css'

type Tab = 'mine' | 'saved'
const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'mine', label: '나의 레시피' },
  { key: 'saved', label: '저장한 맛' },
]

/**
 * [S-08] 마이페이지 — 목업 기준
 * 프로필 사진·이름·지역 / 활동 통계 / 나의 레시피·저장한 맛 탭 + 3열 그리드
 */
function ProfilePage() {
  const goBack = useGoBack('/')
  const [searchParams, setSearchParams] = useSearchParams()
  // 탭을 주소(?tab=saved)에 두면 레시피 상세에서 뒤로 와도 보던 탭이 유지됨
  const tab: Tab = searchParams.get('tab') === 'saved' ? 'saved' : 'mine'
  const { profile, error, loading, reload } = useMyProfile()

  return (
    <main className="profile-page">
      <h1 className="sr-only">마이페이지</h1>
      <header className="profile-topbar">
        <button type="button" className="profile-back" onClick={goBack} aria-label="뒤로">‹</button>
      </header>

      <section className="profile-head">
        {loading || !profile ? (
          <>
            <span className="avatar is-skeleton" style={{ width: 56, height: 56 }} />
            <div className="profile-head-text"><span className="skeleton-line w-24" /><span className="skeleton-line w-32" /></div>
          </>
        ) : (
          <>
            <Avatar src={profile.avatar_url} size={56} alt={`${profile.display_name} 프로필 사진`} />
            <div className="profile-head-text">
              <p className="profile-name">{profile.display_name}</p>
              <p className="profile-region">{formatRegion(profile.region)}</p>
            </div>
            <Link className="profile-edit-button" to="/profile/edit">프로필 편집</Link>
          </>
        )}
      </section>

      {error ? (
        <div className="profile-message">
          <p>{errorText(error)}</p>
          <button type="button" onClick={reload}>다시 불러오기</button>
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
            {/* key 로 탭마다 목록 상태를 새로 만듦 (이전 탭 데이터가 섞이지 않게) */}
            {tab === 'mine' ? (
              <RecipeGrid
                key="mine"
                fetcher={getMyRecipes}
                empty={<div className="profile-message"><p>아직 전승한 레시피가 없어요.</p><Link to="/record">첫 레시피 기록하러 가기</Link></div>}
              />
            ) : (
              <RecipeGrid
                key="saved"
                fetcher={getMySaved}
                empty={<div className="profile-message"><p>저장한 레시피가 없어요.</p><Link to="/">레시피 둘러보기</Link></div>}
              />
            )}
          </section>
        </>
      )}
    </main>
  )
}

export default ProfilePage
