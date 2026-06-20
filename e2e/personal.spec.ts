import { test, expect } from '@playwright/test'
import { gotoPersonalHome, addExercise, pickExercise } from './helpers.ts'

test('루틴 생성 → 이 루틴으로 기록 시작 → 홈 표시', async ({ page }) => {
  await gotoPersonalHome(page)
  await addExercise(page, 'E2E 스쿼트')

  // 루틴 생성
  await page.getByRole('link', { name: '루틴' }).click()
  await page.getByLabel('루틴 추가').click()
  await page.getByPlaceholder(/제목 입력/).fill('E2E 하체루틴')
  await pickExercise(page, 'E2E 스쿼트')
  await page.getByRole('button', { name: '저장' }).click()

  // 루틴 상세 → 기록 시작
  await page.getByText('E2E 하체루틴').click()
  await page.getByRole('button', { name: '이 루틴으로 기록 시작' }).click()
  await expect(page.locator('.routine-ex__name')).toHaveText('E2E 스쿼트')
  await page.getByRole('button', { name: '저장' }).click()

  // 저장 후 루틴 상세로 복귀 → 뒤로 → 홈 탭 (SPA 이동)
  await page.getByRole('button', { name: '뒤로' }).click()
  await page.getByRole('link', { name: '홈' }).click()
  await expect(page.getByText('E2E 하체루틴')).toBeVisible()
})

test('시간 측정 운동 기록(분/초 입력)', async ({ page }) => {
  await gotoPersonalHome(page)
  await addExercise(page, 'E2E 플랭크', '시간')

  await page.getByRole('link', { name: '홈' }).click()
  await page.getByLabel('운동 추가').click()
  await pickExercise(page, 'E2E 플랭크')

  // 시간 측정: 분/초 입력칸
  await expect(page.getByText('분')).toBeVisible()
  const inputs = page.locator('.set-row__input')
  await inputs.nth(0).fill('1')
  await inputs.nth(1).fill('30')
  await page.getByRole('button', { name: '저장' }).click()

  await expect(page.getByText('E2E 플랭크')).toBeVisible()
})

test('운동 선택 화면에서 새 운동 인라인 생성 (측정 방식 지정)', async ({ page }) => {
  await gotoPersonalHome(page)
  // 운동을 미리 등록하지 않고, 기록 추가 → picker에서 바로 생성
  await page.getByLabel('운동 추가').click()
  await page.getByRole('button', { name: '+ 운동 추가' }).click()
  await page.getByPlaceholder('운동 이름 검색').fill('E2E 런닝머신')
  // 작은 링크 → 펼쳐서 측정 방식 '거리 + 시간' 선택 후 만들기
  await page.locator('.picker__create-link').click()
  await page.locator('.picker__create').getByRole('button', { name: '거리 + 시간' }).click()
  await page.locator('.picker__create').getByRole('button', { name: '만들기' }).click()
  // 생성 후 자동 선택 → 확정
  await page.locator('.picker__confirm').click()
  await expect(page.locator('.routine-ex__name')).toHaveText('E2E 런닝머신')
  // 측정 방식이 거리+시간으로 반영 → km 단위 입력칸
  await expect(page.locator('.set-row__unit').first()).toHaveText('km')
})

test('기록 케밥 → 삭제', async ({ page }) => {
  await gotoPersonalHome(page)
  await addExercise(page, 'E2E 데드')

  await page.getByRole('link', { name: '홈' }).click()
  await page.getByLabel('운동 추가').click()
  await page.getByPlaceholder(/제목 입력/).fill('삭제될 기록')
  await pickExercise(page, 'E2E 데드')
  await page.getByRole('button', { name: '저장' }).click()

  // 홈 카드 → 상세 → 케밥 → 삭제
  await expect(page.getByText('삭제될 기록')).toBeVisible()
  await page.getByText('삭제될 기록').click()
  await page.getByLabel('더보기').click()
  await page.getByRole('dialog').getByRole('button', { name: '삭제' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: '삭제' }).click()

  // 홈으로 돌아와 사라짐
  await expect(page.getByText('이번 달 기록이 없습니다.')).toBeVisible()
})
