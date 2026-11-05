import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { readMockDb } from '../../lib/mock/mockDb'
import { currentPath, loginAsDemo, loginAsNewUser, renderApp } from '../../test/renderApp'

describe('마이페이지', () => {
  it('내 프로필·통계·나의 레시피를 보여준다', async () => {
    loginAsDemo()
    renderApp('/profile')
    expect(await screen.findByText('김한술')).toBeInTheDocument()
    expect(screen.getByText('경상북도 · 안동시')).toBeInTheDocument()
    const stats = screen.getAllByRole('definition').map((item) => item.textContent)
    expect(stats).toEqual(['2', '8', '34'])
    expect(await screen.findByRole('link', { name: '안동 찜닭' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '안동 간고등어 조림' })).toBeInTheDocument()
  })

  it('저장한 맛 탭을 누르면 저장한 레시피로 바뀌고 주소에 탭이 남는다', async () => {
    loginAsDemo()
    const user = renderApp('/profile')
    await user.click(await screen.findByRole('tab', { name: '저장한 맛' }))
    expect(await screen.findByRole('link', { name: '포항 모리국수' })).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(8)
    expect(screen.getByRole('tab', { name: '저장한 맛' })).toHaveAttribute('aria-selected', 'true')
    expect(currentPath()).toHaveTextContent('/profile?tab=saved')
  })

  it('레시피가 없으면 빈 화면 안내를 보여준다', async () => {
    loginAsNewUser(true)
    renderApp('/profile')
    expect(await screen.findByText('아직 전승한 레시피가 없어요.')).toBeInTheDocument()
    expect(screen.getByText('지역 미설정')).toBeInTheDocument()
  })

  it('프로필이 없는 계정(온보딩 전)은 온보딩으로 보낸다', async () => {
    loginAsNewUser(false)
    renderApp('/profile')
    expect(await screen.findByText('어떤 이름을 사용하실 건가요?')).toBeInTheDocument()
    expect(currentPath()).toHaveTextContent('/onboarding')
  })
})

describe('프로필 편집', () => {
  it('기존 정보가 채워져 있고, 바뀐 게 없으면 저장할 수 없다', async () => {
    loginAsDemo()
    const user = renderApp('/profile/edit')
    const nameInput = await screen.findByLabelText('이름')
    expect(nameInput).toHaveValue('김한술')
    expect(screen.getByText('경상북도 · 안동시')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '저장하기' })).toBeDisabled()

    await user.clear(nameInput)
    expect(screen.getByRole('button', { name: '저장하기' })).toBeDisabled() // 이름이 비면 저장 불가
  })

  it('이름·지역을 바꿔 저장하면 마이페이지에 반영된다', async () => {
    loginAsDemo()
    const user = renderApp('/profile/edit')
    const nameInput = await screen.findByLabelText('이름')
    await user.clear(nameInput)
    await user.type(nameInput, '한술할매')

    await user.click(screen.getByRole('button', { name: /거주지역/ }))
    const sheet = screen.getByRole('dialog')
    await user.click(within(sheet).getByRole('tab', { name: '대구광역시' }))
    await user.click(within(sheet).getByRole('button', { name: '수성구' }))
    await user.click(within(sheet).getByRole('button', { name: '선택완료' }))

    await user.click(screen.getByRole('button', { name: '저장하기' }))
    expect(await screen.findByText('한술할매')).toBeInTheDocument()
    expect(screen.getByText('대구광역시 · 수성구')).toBeInTheDocument()
    expect(currentPath()).toHaveTextContent('/profile')

    const saved = readMockDb().profiles['mock-user-demo']
    expect(saved.display_name).toBe('한술할매')
    expect(saved.region?.code).toBe('27260')
  })
})

describe('다른 사용자 프로필', () => {
  it('전승자 정보와 레시피를 보여주고 편집 버튼은 없다', async () => {
    loginAsDemo()
    renderApp('/users/u-kim-hansul')
    expect(await screen.findByText('안녕하세요 여러분ㅎㅎ 같이 레시피 공유해봐요~')).toBeInTheDocument()
    expect(screen.getByText('대구광역시 · 수성구')).toBeInTheDocument()
    expect(screen.getAllByRole('definition').map((item) => item.textContent)).toEqual(['5', '63'])
    expect(await screen.findByRole('link', { name: '누른 국수' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: '프로필 편집' })).not.toBeInTheDocument()
  })

  it('없는 사용자는 안내 문구를 보여준다', async () => {
    loginAsDemo()
    renderApp('/users/nobody')
    expect(await screen.findByText('프로필을 찾을 수 없어요.')).toBeInTheDocument()
  })

  it('내 id 로 들어오면 마이페이지로 보낸다', async () => {
    loginAsDemo()
    renderApp('/users/mock-user-demo')
    expect(await screen.findByRole('link', { name: '프로필 편집' })).toBeInTheDocument()
    expect(currentPath()).toHaveTextContent('/profile')
  })
})
