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

// 보조 무게(어시스트) 운동 등록
export async function addAssistedExercise(page: Page, name: string) {
  await page.getByRole('link', { name: '운동' }).click()
  await page.getByLabel('운동 추가').click()
  await page.getByPlaceholder('운동 입력').fill(name)
  await page.getByLabel('보조 무게').check()
  await page.getByRole('button', { name: '저장' }).click()
  await expect(page.getByText(name)).toBeVisible()
}

// 기록 폼에서 운동 picker로 운동 추가
export async function pickExercise(page: Page, name: string) {
  await page.getByRole('button', { name: '+ 운동 추가' }).click()
  await page.locator('.exercise-card', { hasText: name }).click()
  await page.locator('.picker__confirm').click()
}

// 완료 상태 기록 하나 생성. inputs는 세트 입력칸 순서대로 채운다
// (무게×횟수: [kg, 회] / 거리+시간: [km, 분, 초]).
// 이전 기록 대비(▲▼)를 보려면 시간을 다르게 줘 순서를 만든다.
export async function createCompletedLog(
  page: Page,
  opts: { title: string; time: string; exercise: string; inputs: string[] },
) {
  await page.getByRole('link', { name: '홈' }).click()
  await page.getByLabel('운동 추가').click()
  await page.getByPlaceholder(/제목 입력/).fill(opts.title)
  await page.locator('input[type="time"]').fill(opts.time)
  await page.getByRole('button', { name: '완료', exact: true }).click()
  await pickExercise(page, opts.exercise)
  const inputs = page.locator('.set-row__input')
  for (const [i, v] of opts.inputs.entries()) await inputs.nth(i).fill(v)
  await page.getByRole('button', { name: '저장' }).click()
  await expect(page.getByText(opts.title)).toBeVisible()
}
