import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router'
import { useGoBack } from '../../app/useGoBack'
import Avatar from '../../components/Avatar'
import RegionSheet from '../../components/region/RegionSheet'
import { ApiError } from '../../lib/api/client'
import { updateMyProfile } from '../../lib/api/profile'
import type { MyProfile, ProfileUpdateBody } from '../../lib/api/types'
import { validateImageFile } from '../../lib/image'
import { findRegionByCode, formatRegion, type RegionOption } from '../../lib/regions'
import { uploadAvatar } from '../../lib/storage'
import { useAuth } from '../auth/auth-context'
import { errorText, useMyProfile } from './useMyProfile'
import './profile.css'

const NAME_MAX = 12

function toOption(profile: MyProfile): RegionOption | null {
  const region = profile.region
  if (!region) return null
  return findRegionByCode(region.code) ?? { code: region.code, sido: region.sido, sigungu: region.sigungu }
}

/** 프로필을 다 불러온 뒤에만 그려지는 편집 폼 — 기존 값으로 바로 시작 (완료 기준: 기존 정보 표시) */
function EditForm({ profile }: { profile: MyProfile }) {
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const [name, setName] = useState(profile.display_name)
  const [region, setRegion] = useState<RegionOption | null>(() => toOption(profile))
  const [photo, setPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const previewUrl = useRef<string | null>(null)

  // 화면을 떠날 때 미리보기용 임시 주소 정리 (메모리 해제)
  useEffect(() => () => {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current)
  }, [])

  const trimmed = name.trim()
  const nameChanged = trimmed !== profile.display_name
  const regionChanged = (region?.code ?? null) !== (profile.region?.code ?? null)
  const canSave = (nameChanged || regionChanged || photo !== null) && trimmed.length > 0 && !saving

  function pickPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = '' // 같은 사진을 다시 골라도 반응하도록
    if (!file) return
    const problem = validateImageFile(file)
    if (problem) return setError(problem)
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current)
    previewUrl.current = URL.createObjectURL(file)
    setPreview(previewUrl.current)
    setPhoto(file)
    setError(null)
  }

  // 직접 로그아웃하면 다시 로그인했을 때 이 편집 화면이 아니라 홈으로 가도록 '돌아갈 곳' 없이 로그인 화면으로
  async function logout() {
    await signOut()
    navigate('/login', { replace: true })
  }

  async function save() {
    if (!canSave) return
    setSaving(true)
    setError(null)
    try {
      // 바뀐 필드만 보냄 (명세서: 일부 필드만 보내도 됨)
      const body: ProfileUpdateBody = {}
      if (nameChanged) body.display_name = trimmed
      if (regionChanged && region) body.region_code = region.code
      if (photo) body.avatar_url = await uploadAvatar(photo)
      await updateMyProfile(body)
      navigate('/profile', { replace: true })
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) return void signOut()
      setError(caught instanceof ApiError || !(caught instanceof Error) ? errorText(caught) : caught.message)
      setSaving(false)
    }
  }

  return (
    <>
      <section className="profile-edit-photo">
        <Avatar src={preview ?? profile.avatar_url} size={76} alt="프로필 사진" />
        <button type="button" onClick={() => fileInput.current?.click()}>사진 변경</button>
        <input ref={fileInput} type="file" accept="image/*" hidden onChange={pickPhoto} aria-label="프로필 사진 선택" />
      </section>

      <div className="profile-edit-fields">
        <label className="profile-edit-row">
          <span>이름</span>
          <input value={name} maxLength={NAME_MAX} onChange={(event) => setName(event.target.value)} aria-label="이름" />
        </label>
        <button type="button" className="profile-edit-row" onClick={() => setSheetOpen(true)} aria-haspopup="dialog">
          <span>거주지역</span>
          <strong>{region ? formatRegion(region) : '지역 선택'}</strong>
          <i aria-hidden="true">›</i>
        </button>
      </div>

      <button type="button" className="profile-logout" onClick={() => void logout()}>로그아웃</button>

      <div className="profile-edit-bottom">
        {error && <p className="profile-error" role="alert">{error}</p>}
        <button type="button" className="profile-save" onClick={() => void save()} disabled={!canSave}>{saving ? '저장 중…' : '저장하기'}</button>
      </div>

      {sheetOpen && (
        <RegionSheet
          value={region?.code ?? null}
          onClose={() => setSheetOpen(false)}
          onConfirm={(selected) => {
            setRegion(selected)
            setSheetOpen(false)
          }}
        />
      )}
    </>
  )
}

/** [S-08] 프로필 편집 — 사진·이름·거주지역 수정 후 저장하면 마이페이지로 */
function ProfileEditPage() {
  const goBack = useGoBack('/profile')
  const { profile, error } = useMyProfile()

  return (
    <main className="profile-page profile-edit-page">
      <h1 className="sr-only">프로필 편집</h1>
      <header className="profile-topbar">
        <button type="button" className="profile-back" onClick={goBack} aria-label="뒤로">‹</button>
      </header>
      {error ? (
        <div className="profile-message"><p>{errorText(error)}</p></div>
      ) : profile ? (
        <EditForm profile={profile} />
      ) : (
        <section className="profile-edit-photo"><span className="avatar is-skeleton" style={{ width: 76, height: 76 }} /></section>
      )}
    </main>
  )
}

export default ProfileEditPage
