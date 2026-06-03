import { test, expect } from '@playwright/test'

// 개인 모드 핵심 흐름: 운동 등록 → 기록 작성 → 홈 표시 → 히스토리
test('운동 등록 → 기록 작성 → 홈/히스토리 확인', async ({ page }) => {
  await page.goto('/')

  // 스플래시 후 개인 홈 (기본 모드 personal)
  await expect(page.getByText('이번 달 기록이 없습니다.')).toBeVisible({ timeout: 10_000 })

  // 운동 탭 → 운동 추가
  await page.getByRole('link', { name: '운동' }).click()
  await expect(page.getByText('등록된 운동이 없습니다')).toBeVisible()
  await page.getByLabel('운동 추가').click()
  await page.getByPlaceholder('운동 입력').fill('E2E 벤치프레스')
  await page.getByRole('button', { name: '저장' }).click()

  // 목록에 노출
  await expect(page.getByText('E2E 벤치프레스')).toBeVisible()

  // 홈으로 → 기록 추가
  await page.getByRole('link', { name: '홈' }).click()
  await page.getByLabel('운동 추가').click() // 홈 FAB → /logs/new

  // 운동 picker에서 추가
  await page.getByRole('button', { name: '+ 운동 추가' }).click()
  await page.locator('.exercise-card', { hasText: 'E2E 벤치프레스' }).click()
  await page.locator('.picker__confirm').click()
  await expect(page.locator('.routine-ex__name')).toHaveText('E2E 벤치프레스')

  // 제목 입력 후 저장
  await page.getByPlaceholder(/제목 입력/).fill('E2E 상체 데이')
  await page.getByRole('button', { name: '저장' }).click()

  // 홈 카드에 표시
  await expect(page.getByText('E2E 상체 데이')).toBeVisible()
})

test('모드 전환: 개인 → 트레이너', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByText('이번 달 기록이 없습니다.')).toBeVisible({ timeout: 10_000 })

  // 홈 타이틀 클릭 → 모드 시트
  await page.getByRole('button', { name: /홈/ }).first().click()
  await page.getByRole('button', { name: '트레이너' }).click()

  // 트레이너 홈: 회원 탭 존재
  await expect(page.getByRole('link', { name: '회원' })).toBeVisible()
})
