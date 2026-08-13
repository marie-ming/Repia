import { test, expect } from '@playwright/test'
import {
  gotoPersonalHome,
  addExercise,
  addAssistedExercise,
  createCompletedLog,
} from './helpers.ts'

// "무엇을 최고 기록으로 볼 것인가" — 보조 무게(적을수록)와 거리+시간(거리 우선, 같으면 더 빠르게).
// 이전 기록 대비 ▲▼는 기록 상세에서만 나오므로 완료 기록 두 개를 만들어 확인한다.

const badge = (page: import('@playwright/test').Page) => page.locator('.routine-readonly__best')
const delta = (page: import('@playwright/test').Page) => page.locator('.routine-readonly__delta')

test('보조 무게: 보조가 줄면 "보조 N kg" + ▲', async ({ page }) => {
  await gotoPersonalHome(page)
  await addAssistedExercise(page, 'E2E 어시스트풀업')

  await createCompletedLog(page, {
    title: 'E2E 지난 등',
    time: '08:00',
    exercise: 'E2E 어시스트풀업',
    inputs: ['40', '8'],
  })
  await createCompletedLog(page, {
    title: 'E2E 오늘 등',
    time: '20:00',
    exercise: 'E2E 어시스트풀업',
    inputs: ['30', '8'],
  })

  await page.getByText('E2E 오늘 등').click()
  // 최대가 아니라 최소가 기록이고, 문구도 "최고"가 아닌 "보조"
  await expect(badge(page)).toHaveText('보조 30kg×8')
  await expect(delta(page)).toHaveText('▲ 지난 40kg×8')
})

test('보조 무게: 비워둔 세트(0)는 "보조 0kg"이 되지 않는다', async ({ page }) => {
  await gotoPersonalHome(page)
  await addAssistedExercise(page, 'E2E 어시스트딥스')

  // 1세트만 채우고 2세트는 비운 채로 저장
  await page.getByRole('link', { name: '홈' }).click()
  await page.getByLabel('운동 추가').click()
  await page.getByPlaceholder(/제목 입력/).fill('E2E 빈세트')
  await page.getByRole('button', { name: '완료', exact: true }).click()
  await page.getByRole('button', { name: '+ 운동 추가' }).click()
  await page.locator('.exercise-card', { hasText: 'E2E 어시스트딥스' }).click()
  await page.locator('.picker__confirm').click()
  const inputs = page.locator('.set-row__input')
  await inputs.nth(0).fill('35')
  await inputs.nth(1).fill('8')
  await page.getByRole('button', { name: '+ 세트 추가' }).click()
  // 추가된 세트는 직전 값이 복사되므로 0으로 비운다
  await page.locator('.set-row').nth(1).locator('.set-row__input').nth(0).fill('0')
  await page.locator('.set-row').nth(1).locator('.set-row__input').nth(1).fill('0')
  await page.getByRole('button', { name: '저장' }).click()

  await page.getByText('E2E 빈세트').click()
  await expect(badge(page)).toHaveText('보조 35kg×8')
})

test('거리 + 시간: 같은 거리를 더 빨리 뛰면 ▲', async ({ page }) => {
  await gotoPersonalHome(page)
  await addExercise(page, 'E2E 러닝', '거리 + 시간')

  await createCompletedLog(page, {
    title: 'E2E 지난 러닝',
    time: '08:00',
    exercise: 'E2E 러닝',
    inputs: ['5', '30', '0'], // 5km 30:00
  })
  await createCompletedLog(page, {
    title: 'E2E 오늘 러닝',
    time: '20:00',
    exercise: 'E2E 러닝',
    inputs: ['5', '24', '30'], // 5km 24:30
  })

  await page.getByText('E2E 오늘 러닝').click()
  // 거리만 보던 예전에는 변화가 잡히지 않던 케이스
  await expect(badge(page)).toHaveText('최고 5km 24:30')
  await expect(delta(page)).toHaveText('▲ 지난 5km 30:00')
})

test('거리 + 시간: 페이스가 느려져도 더 멀리 뛰면 ▲', async ({ page }) => {
  await gotoPersonalHome(page)
  await addExercise(page, 'E2E 러닝2', '거리 + 시간')

  await createCompletedLog(page, {
    title: 'E2E 지난 러닝2',
    time: '08:00',
    exercise: 'E2E 러닝2',
    inputs: ['3', '15', '0'], // 3km 15:00 = 5:00/km
  })
  await createCompletedLog(page, {
    title: 'E2E 오늘 러닝2',
    time: '20:00',
    exercise: 'E2E 러닝2',
    inputs: ['5', '30', '0'], // 5km 30:00 = 6:00/km
  })

  await page.getByText('E2E 오늘 러닝2').click()
  await expect(badge(page)).toHaveText('최고 5km 30:00')
  await expect(delta(page)).toHaveText('▲ 지난 3km 15:00')
})

// 같은 무게로 횟수를 늘리는 건 흔한 향상인데, 예전에는 무게만 봐서 아무 신호가 없었다.
test('무게가 같고 횟수만 늘어도 ▲', async ({ page }) => {
  await gotoPersonalHome(page)
  await addExercise(page, 'E2E 컬')

  await createCompletedLog(page, {
    title: 'E2E 지난 팔',
    time: '08:00',
    exercise: 'E2E 컬',
    inputs: ['20', '8'],
  })
  await createCompletedLog(page, {
    title: 'E2E 오늘 팔',
    time: '20:00',
    exercise: 'E2E 컬',
    inputs: ['20', '14'],
  })

  await page.getByText('E2E 오늘 팔').click()
  await expect(badge(page)).toHaveText('최고 20kg×14')
  await expect(delta(page)).toHaveText('▲ 지난 20kg×8')
})

// 계획만 해두고 건너뛴 운동이 「지난 0kg」으로 잡혀 늘 ▲가 뜨던 문제
test('값을 안 채운 기록은 건너뛰고 실제 직전 기록과 비교한다', async ({ page }) => {
  await gotoPersonalHome(page)
  await addExercise(page, 'E2E 스쿼트')

  await createCompletedLog(page, {
    title: 'E2E 실제로 한 날',
    time: '08:00',
    exercise: 'E2E 스쿼트',
    inputs: ['60', '8'],
  })
  await createCompletedLog(page, {
    title: 'E2E 건너뛴 날',
    time: '12:00',
    exercise: 'E2E 스쿼트',
    inputs: ['0', '0'],
  })
  await createCompletedLog(page, {
    title: 'E2E 오늘',
    time: '20:00',
    exercise: 'E2E 스쿼트',
    inputs: ['70', '8'],
  })

  await page.getByText('E2E 오늘').click()
  await expect(badge(page)).toHaveText('최고 70kg×8')
  await expect(delta(page)).toHaveText('▲ 지난 60kg×8')

  // 건너뛴 기록에는 최고 배지 자체가 없다
  await page.goBack()
  await page.getByText('E2E 건너뛴 날').click()
  await expect(badge(page)).toHaveCount(0)
})

