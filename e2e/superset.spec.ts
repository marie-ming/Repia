import { test, expect } from '@playwright/test'
import { gotoPersonalHome, addExercise, pickExercise } from './helpers.ts'

// a운동 3세트 / (b운동 + c운동) 3라운드 / 처럼 두 운동을 한 세트로 묶는 흐름
test('두 운동을 슈퍼세트로 묶어 기록 → 저장 후에도 묶음 유지', async ({ page }) => {
  await gotoPersonalHome(page)
  await addExercise(page, 'E2E 벤치')
  await addExercise(page, 'E2E 인클라인')
  await addExercise(page, 'E2E 플라이')

  await page.getByRole('link', { name: '홈' }).click()
  await page.getByLabel('운동 추가').click()
  await page.getByPlaceholder(/제목 입력/).fill('E2E 가슴 데이')
  await pickExercise(page, 'E2E 벤치')
  await pickExercise(page, 'E2E 인클라인')
  await pickExercise(page, 'E2E 플라이')
  await expect(page.locator('.routine-ex')).toHaveCount(3)

  // 3번째(플라이)를 위(인클라인)와 묶기 → 슈퍼세트
  await page.getByLabel('위 운동과 묶기').nth(2).click()

  const superset = page.locator('.superset')
  await expect(superset).toHaveCount(1)
  await expect(superset.locator('.routine-ex__name')).toHaveText(['E2E 인클라인', 'E2E 플라이'])
  await expect(superset.locator('.superset__rounds')).toHaveText('1라운드')

  // 묶음은 라운드 단위로 세트가 늘고, 묶음 밖 운동은 그대로
  await page.getByRole('button', { name: '+ 라운드 추가' }).click()
  await page.getByRole('button', { name: '+ 라운드 추가' }).click()
  await expect(superset.locator('.superset__rounds')).toHaveText('3라운드')
  await expect(superset.locator('.routine-ex').nth(0).locator('.set-row')).toHaveCount(3)
  await expect(superset.locator('.routine-ex').nth(1).locator('.set-row')).toHaveCount(3)
  await expect(page.locator('.routine-ex').nth(0).locator('.set-row')).toHaveCount(1) // 벤치

  await page.getByRole('button', { name: '저장' }).click()

  // 상세(읽기 전용)에서도 묶음으로 보인다
  await expect(page.getByText('E2E 가슴 데이')).toBeVisible()
  await page.getByText('E2E 가슴 데이').click()
  const roGroup = page.locator('.routine-readonly__group')
  await expect(roGroup).toHaveCount(1)
  await expect(roGroup.locator('.routine-readonly__grouplabel')).toHaveText('슈퍼세트')
  await expect(roGroup.locator('.routine-readonly__grouprounds')).toHaveText('3라운드')
  await expect(roGroup.locator('.routine-readonly__name')).toHaveText([
    'E2E 인클라인',
    'E2E 플라이',
  ])

  // 다시 편집해도 묶음이 복원된다
  await page.getByLabel('더보기').click()
  await page.getByRole('dialog').getByText('수정').click()
  await expect(page.locator('.superset')).toHaveCount(1)
  await expect(page.locator('.superset__rounds')).toHaveText('3라운드')
})

test('묶음 해제하면 개별 운동으로 돌아온다', async ({ page }) => {
  await gotoPersonalHome(page)
  await addExercise(page, 'E2E 스쿼트')
  await addExercise(page, 'E2E 런지')

  await page.getByRole('link', { name: '홈' }).click()
  await page.getByLabel('운동 추가').click()
  await pickExercise(page, 'E2E 스쿼트')
  await pickExercise(page, 'E2E 런지')

  await page.getByLabel('위 운동과 묶기').nth(1).click()
  await expect(page.locator('.superset')).toHaveCount(1)

  await page.getByLabel('묶음 해제').first().click()
  await expect(page.locator('.superset')).toHaveCount(0)
  await expect(page.getByRole('button', { name: '+ 세트 추가' })).toHaveCount(2)
})
