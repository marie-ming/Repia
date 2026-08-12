import { test, expect } from '@playwright/test'
import { gotoPersonalHome, addExercise, pickExercise } from './helpers.ts'

// 긴 운동명이 편집 카드의 액션 버튼 영역을 밀어내
// 「묶기」가 "묶 / 기" 두 줄로 쪼개지던 문제.
test('긴 운동명이 들어와도 편집 카드의 버튼이 쪼개지지 않는다', async ({ page }) => {
  const longName = 'E2E 인클라인 덤벨 벤치프레스 슈퍼 와이드 그립 파셜 렙 드롭세트 변형'
  await gotoPersonalHome(page)
  await addExercise(page, longName)
  await addExercise(page, 'E2E 짧은운동')

  await page.getByRole('link', { name: '홈' }).click()
  await page.getByLabel('운동 추가').click()
  await pickExercise(page, longName)
  await pickExercise(page, 'E2E 짧은운동')
  await expect(page.locator('.routine-ex')).toHaveCount(2)

  // 두 카드의 「묶기」 버튼 높이가 같아야 한다(한 줄). 긴 이름 쪽만 두 줄이 되면 실패
  const heights = await page
    .locator('.routine-ex__link')
    .evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().height)))
  expect(heights[0]).toBe(heights[1])

  // 액션 영역이 눌리지도 않아야 한다
  const actionWidths = await page
    .locator('.routine-ex__actions')
    .evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().width)))
  expect(actionWidths[0]).toBe(actionWidths[1])

  // 가로 스크롤이 생기면 안 된다
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(overflow).toBe(false)
})
