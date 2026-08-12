import { test, expect } from '@playwright/test'
import { gotoPersonalHome, addExercise, pickExercise } from './helpers.ts'

// 이 기능의 핵심은 "앱이 내려갔다 다시 열려도 남아 있는가"다.
// 유닛 테스트(MemoryRouter)로는 진짜 페이지 재시작을 재현할 수 없어 여기서 확인한다.

test('작성 중 앱이 완전히 다시 열려도 이어쓸 수 있다', async ({ page }) => {
  await gotoPersonalHome(page)
  await addExercise(page, 'E2E 초안운동')

  await page.getByRole('link', { name: '홈' }).click()
  await page.getByLabel('운동 추가').click()
  await page.getByPlaceholder(/제목 입력/).fill('E2E 작성중인 기록')
  await pickExercise(page, 'E2E 초안운동')
  const inputs = page.locator('.set-row__input')
  await inputs.nth(0).fill('70')
  await inputs.nth(1).fill('8')

  // 저장하지 않은 채 앱을 통째로 다시 연다 (전화 받다 앱이 내려간 상황).
  // 실제로는 마지막 입력과 앱 종료 사이에 최소 수백 ms가 있으므로 디바운스가 돈다.
  await page.waitForTimeout(700)
  await page.goto('/')
  await page.goto('/logs/new')

  await expect(page.getByText('작성 중이던 기록이 있어요')).toBeVisible()
  await page.getByRole('button', { name: '이어쓰기' }).click()

  await expect(page.getByPlaceholder(/제목 입력/)).toHaveValue('E2E 작성중인 기록')
  await expect(page.locator('.routine-ex__name')).toHaveText('E2E 초안운동')
  await expect(page.locator('.set-row__input').nth(0)).toHaveValue('70')
})

test('뒤로 나가면 경고 없이 임시 저장되고, 저장까지 마치면 초안이 사라진다', async ({ page }) => {
  await gotoPersonalHome(page)
  await addExercise(page, 'E2E 초안운동2')

  await page.getByRole('link', { name: '홈' }).click()
  await page.getByLabel('운동 추가').click()
  await page.getByPlaceholder(/제목 입력/).fill('E2E 나가기')
  await pickExercise(page, 'E2E 초안운동2')

  // 새 기록은 초안이 남으므로 "사라집니다" 경고 대신 임시 저장 안내가 떠야 한다
  await page.getByLabel('뒤로').click()
  await expect(page.getByRole('status')).toContainText('임시 저장')
  await expect(page.getByText('저장하지 않은 변경사항이 있습니다')).toHaveCount(0)

  // 다시 들어오면 이어쓸 수 있고, 저장을 끝내면 초안은 정리된다
  await page.getByLabel('운동 추가').click()
  await expect(page.getByText('작성 중이던 기록이 있어요')).toBeVisible()
  await page.getByRole('button', { name: '이어쓰기' }).click()
  await page.getByRole('button', { name: '저장' }).click()
  await expect(page.getByText('E2E 나가기')).toBeVisible()

  await page.getByLabel('운동 추가').click()
  await expect(page.getByText('작성 중이던 기록이 있어요')).toHaveCount(0)
})

test('새로 시작을 고르면 초안이 버려진다', async ({ page }) => {
  await gotoPersonalHome(page)
  await page.getByLabel('운동 추가').click()
  await page.getByPlaceholder(/제목 입력/).fill('E2E 버릴 초안')
  await page.getByLabel('뒤로').click()
  await expect(page.getByRole('status')).toContainText('임시 저장')

  await page.getByLabel('운동 추가').click()
  await page.getByRole('button', { name: '새로 시작' }).click()
  await expect(page.getByPlaceholder(/제목 입력/)).toHaveValue('')

  // 다시 들어와도 더는 묻지 않는다
  await page.getByLabel('뒤로').click()
  await page.getByLabel('운동 추가').click()
  await expect(page.getByText('작성 중이던 기록이 있어요')).toHaveCount(0)
})

// left: 50%로 중앙을 잡으면 고정 요소의 가용 폭이 화면 절반으로 줄어,
// 긴 문구가 화면이 넓은데도 줄바꿈됐다.
test('토스트가 긴 문구에서도 한 줄로 나온다', async ({ page }) => {
  await gotoPersonalHome(page)
  await page.getByLabel('운동 추가').click()
  await page.getByPlaceholder(/제목 입력/).fill('토스트 확인')
  await page.getByLabel('뒤로').click()

  const toast = page.getByRole('status')
  await expect(toast).toContainText('임시 저장')

  const box = await toast.boundingBox()
  const oneLine = await toast.evaluate((el) => {
    const cs = getComputedStyle(el)
    // 같은 스타일에 짧은 문구를 넣어 1줄 높이를 잰다
    const probe = el.cloneNode(false) as HTMLElement
    probe.textContent = '짧음'
    el.parentElement!.appendChild(probe)
    const h = probe.getBoundingClientRect().height
    probe.remove()
    void cs
    return h
  })
  expect(box!.height).toBeLessThanOrEqual(oneLine + 2)
})
