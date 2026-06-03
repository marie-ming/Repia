import { test, expect } from '@playwright/test'
import { gotoPersonalHome } from './helpers.ts'

test('데모 데이터 채우기 → 루틴/기록 생성', async ({ page }) => {
  await gotoPersonalHome(page)

  // 설정 → 데이터 관리 → 데모 데이터 채우기
  await page.getByRole('link', { name: '설정' }).click()
  await page.getByText('데이터 관리').click()
  await page.getByRole('button', { name: '데모 데이터 채우기' }).click()
  await expect(page.getByText('데모 데이터가 채워졌습니다')).toBeVisible()

  // 800ms 후 자동 새로고침 → 안정화 대기 후 재진입
  await page.waitForTimeout(1500)
  await page.goto('/')

  // 루틴 탭에 시드 템플릿 표시
  await page.getByRole('link', { name: '루틴' }).click()
  await expect(page.getByText('하체 루틴')).toBeVisible()
})
