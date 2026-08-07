import { test, expect } from '@playwright/test'
import { gotoPersonalHome, addExerciseDetailed } from './helpers.ts'

// 목록에서 필터를 걸고 상세로 갔다 뒤로 오면 필터가 풀리던 버그.
// 유닛 테스트는 MemoryRouter에 URL을 직접 넣는 방식이라 "진짜 뒤로가기"를 확인할 수 없어
// 여기서 실제 브라우저 히스토리로 검증한다.

async function seedExercises(page: import('@playwright/test').Page) {
  await addExerciseDetailed(page, 'E2E 데드리프트', { category: '등', equipment: '바벨' })
  await addExerciseDetailed(page, 'E2E 벤치프레스', { category: '가슴', equipment: '바벨' })
  await addExerciseDetailed(page, 'E2E 풀업', { category: '등', equipment: '맨몸' })
}

test('운동 목록: 부위·장비 필터 → 상세 → 뒤로가기 시 필터 유지', async ({ page }) => {
  await gotoPersonalHome(page)
  await seedExercises(page)

  await page.getByRole('link', { name: '운동' }).click()
  const chipRows = page.locator('.chips--scroll')
  await chipRows.nth(0).getByRole('button', { name: '등', exact: true }).click()
  await chipRows.nth(1).getByRole('button', { name: '바벨', exact: true }).click()

  // 등 + 바벨 = 데드리프트만
  await expect(page.locator('.exercise-card')).toHaveCount(1)
  await expect(page.getByText('E2E 데드리프트')).toBeVisible()
  expect(new URL(page.url()).search).toBe('?cat=back&eq=barbell')

  await page.locator('.exercise-card').click()
  await expect(page).toHaveURL(/\/exercises\/ex_/)

  await page.goBack()

  // 필터가 그대로 살아 있어야 한다 (URL·활성 칩·목록 모두)
  expect(new URL(page.url()).search).toBe('?cat=back&eq=barbell')
  await expect(page.locator('.exercise-card')).toHaveCount(1)
  await expect(page.getByText('E2E 데드리프트')).toBeVisible()
  await expect(chipRows.nth(0).getByRole('button', { name: '등', exact: true })).toHaveClass(
    /chip--active/,
  )
  await expect(chipRows.nth(1).getByRole('button', { name: '바벨', exact: true })).toHaveClass(
    /chip--active/,
  )
})

test('운동 목록: 검색어도 뒤로가기에서 복원되고, 타이핑이 히스토리를 더럽히지 않는다', async ({
  page,
}) => {
  await gotoPersonalHome(page)
  await seedExercises(page)

  await page.getByRole('link', { name: '운동' }).click()
  const listUrl = page.url()
  // fill()은 한 번에 값을 넣어 히스토리가 한 칸만 는다. 실제 타이핑처럼 한 글자씩 넣어야
  // replace 없이 갱신할 때 히스토리가 쌓이는 걸 잡을 수 있다.
  await page.getByPlaceholder('운동 이름 검색').pressSequentially('데드리')
  await expect(page.locator('.exercise-card')).toHaveCount(1)

  await page.locator('.exercise-card').click()
  await expect(page).toHaveURL(/\/exercises\/ex_/)

  await page.goBack()
  expect(new URL(page.url()).searchParams.get('q')).toBe('데드리')
  await expect(page.getByPlaceholder('운동 이름 검색')).toHaveValue('데드리')
  await expect(page.locator('.exercise-card')).toHaveCount(1)

  // 글자마다 히스토리가 쌓였다면 뒤로가기 한 번에 '데드'(중간 상태)로 갈 것이다.
  // replace로 갱신하므로 검색 이전의 목록 URL로 바로 빠져야 한다.
  await page.goBack()
  expect(page.url()).toBe(listUrl)
})

test('회원 목록: 수업종료 포함 필터가 뒤로가기에서 유지된다', async ({ page }) => {
  await gotoPersonalHome(page)

  // 「수업종료」 칩은 종료된 회원이 있을 때만 나오므로 데모 데이터를 쓴다
  await page.getByRole('link', { name: '설정' }).click()
  await page.getByText('데이터 관리').click()
  await page.getByRole('button', { name: '데모 데이터 채우기' }).click()
  await expect(page.getByText('데모 데이터가 채워졌습니다')).toBeVisible()
  await page.waitForTimeout(1500)
  await page.goto('/')

  // 트레이너 모드로 전환
  await page.getByRole('button', { name: /홈/ }).first().click()
  await page.getByRole('button', { name: '트레이너' }).click()

  await page.getByRole('link', { name: '회원' }).click()
  await page.getByRole('button', { name: '수업종료', exact: true }).click()
  expect(new URL(page.url()).searchParams.get('ended')).toBe('1')

  await page.locator('.member-card').first().click()
  await expect(page).toHaveURL(/\/members\/mem_/)

  await page.goBack()
  expect(new URL(page.url()).searchParams.get('ended')).toBe('1')
  await expect(page.getByRole('button', { name: '수업종료', exact: true })).toHaveClass(
    /chip--active/,
  )
})
