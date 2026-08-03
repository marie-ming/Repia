import { expect, type Page } from '@playwright/test'

// 앱 진입 후 개인 홈이 뜰 때까지 대기 (기본 모드 personal)
export async function gotoPersonalHome(page: Page) {
  await page.goto('/')
  await expect(page.getByText('이번 달 기록이 없습니다.')).toBeVisible({ timeout: 10_000 })
}

// 운동 등록 (필요 시 측정 방식 선택)
export async function addExercise(page: Page, name: string, metricLabel?: string) {
  await page.getByRole('link', { name: '운동' }).click()
  await page.getByLabel('운동 추가').click()
  await page.getByPlaceholder('운동 입력').fill(name)
  if (metricLabel) {
    await page.locator('.field', { hasText: '측정 방식' }).locator('.select__control').click()
    await page.getByRole('option', { name: metricLabel, exact: true }).click()
  }
  await page.getByRole('button', { name: '저장' }).click()
  await expect(page.getByText(name)).toBeVisible()
}

// 사진 여러 장을 붙여 운동 등록 (fixtures/*.png)
export async function addExerciseWithPhotos(page: Page, name: string, files: string[]) {
  await page.getByRole('link', { name: '운동' }).click()
  await page.getByLabel('운동 추가').click()
  await page.getByPlaceholder('운동 입력').fill(name)
  await page.locator('input[type="file"]').setInputFiles(files)
  // 리사이즈(canvas)가 끝나 썸네일이 렌더된 뒤 저장
  await expect(page.locator('.photo-thumb img')).toHaveCount(files.length)
  await page.getByRole('button', { name: '저장' }).click()
  await expect(page.getByText(name)).toBeVisible()
}

// 기록 폼에서 운동 picker로 운동 추가
export async function pickExercise(page: Page, name: string) {
  await page.getByRole('button', { name: '+ 운동 추가' }).click()
  await page.locator('.exercise-card', { hasText: name }).click()
  await page.locator('.picker__confirm').click()
}
