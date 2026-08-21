import { test, expect } from '@playwright/test'
import { gotoPersonalHome, addExercise, pickExercise } from './helpers.ts'

// 기록에만 있던 초안을 루틴에도 붙였다. 핵심은 「앱이 내려갔다 다시 열려도 남아 있는가」라
// 유닛(MemoryRouter)으로는 재현할 수 없다.

test('루틴을 짜다 앱이 완전히 다시 열려도 이어쓸 수 있다', async ({ page }) => {
  await gotoPersonalHome(page)
  await addExercise(page, 'E2E 루틴초안운동')

  await page.getByRole('link', { name: '루틴' }).click()
  await page.getByLabel('루틴 추가').click()
  await page.getByPlaceholder(/제목 입력/).fill('E2E 작성중인 루틴')
  await pickExercise(page, 'E2E 루틴초안운동')
  const inputs = page.locator('.set-row__input')
  await inputs.nth(0).fill('80')
  await inputs.nth(1).fill('5')

  // 저장하지 않은 채 앱을 통째로 다시 연다.
  // 마지막 입력과 종료 사이에 수백 ms가 있어야 디바운스가 돈다.
  await page.waitForTimeout(700)
  await page.goto('/')
  await page.goto('/routines/new')

  await expect(page.getByText('작성 중이던 루틴이 있어요')).toBeVisible()
  await page.getByRole('button', { name: '이어쓰기' }).click()

  await expect(page.getByPlaceholder(/제목 입력/)).toHaveValue('E2E 작성중인 루틴')
  await expect(page.locator('.routine-ex__name')).toHaveText('E2E 루틴초안운동')
  await expect(page.locator('.set-row__input').nth(0)).toHaveValue('80')
})

test('루틴 초안: 「새로 시작」을 고르면 빈 폼으로 시작한다', async ({ page }) => {
  await gotoPersonalHome(page)

  await page.getByRole('link', { name: '루틴' }).click()
  await page.getByLabel('루틴 추가').click()
  await page.getByPlaceholder(/제목 입력/).fill('E2E 버릴 루틴')

  await page.waitForTimeout(700)
  await page.goto('/routines/new')

  await expect(page.getByText('작성 중이던 루틴이 있어요')).toBeVisible()
  await page.getByRole('button', { name: '새로 시작' }).click()

  await expect(page.getByPlaceholder(/제목 입력/)).toHaveValue('')
  // 지웠으니 다시 들어와도 묻지 않는다
  await page.goto('/routines/new')
  await expect(page.getByText('작성 중이던 루틴이 있어요')).toHaveCount(0)
})

test('루틴을 저장하면 초안이 남지 않는다', async ({ page }) => {
  await gotoPersonalHome(page)

  await page.getByRole('link', { name: '루틴' }).click()
  await page.getByLabel('루틴 추가').click()
  await page.getByPlaceholder(/제목 입력/).fill('E2E 저장할 루틴')
  await page.waitForTimeout(700)
  await page.getByRole('button', { name: '저장' }).click()

  await expect(page.getByText('루틴이 추가되었습니다')).toBeVisible()

  await page.goto('/routines/new')
  await expect(page.getByText('작성 중이던 루틴이 있어요')).toHaveCount(0)
})

// 폼마다 키가 달라야 서로 덮어쓰지 않는다
test('기록 초안과 루틴 초안은 서로 간섭하지 않는다', async ({ page }) => {
  await gotoPersonalHome(page)

  await page.getByLabel('운동 추가').click()
  await page.getByPlaceholder(/제목 입력/).fill('E2E 기록 초안')
  await page.waitForTimeout(700)

  await page.goto('/routines/new')
  await page.getByPlaceholder(/제목 입력/).fill('E2E 루틴 초안')
  await page.waitForTimeout(700)

  await page.goto('/logs/new')
  await expect(page.getByText('작성 중이던 기록이 있어요')).toBeVisible()
  await page.getByRole('button', { name: '이어쓰기' }).click()
  await expect(page.getByPlaceholder(/제목 입력/)).toHaveValue('E2E 기록 초안')

  await page.goto('/routines/new')
  await expect(page.getByText('작성 중이던 루틴이 있어요')).toBeVisible()
  await page.getByRole('button', { name: '이어쓰기' }).click()
  await expect(page.getByPlaceholder(/제목 입력/)).toHaveValue('E2E 루틴 초안')
})
