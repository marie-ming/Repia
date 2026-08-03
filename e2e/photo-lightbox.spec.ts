import { test, expect, type Page } from '@playwright/test'
import { fileURLToPath } from 'node:url'
import { gotoPersonalHome, addExerciseWithPhotos } from './helpers.ts'

const PHOTO_1 = fileURLToPath(new URL('./fixtures/photo-1.png', import.meta.url))
const PHOTO_2 = fileURLToPath(new URL('./fixtures/photo-2.png', import.meta.url))

// 사진을 꾹 눌러 라이트박스를 연다(짧은 탭/스와이프와 구분되는 450ms 임계값)
async function longPressPhoto(page: Page, index = 0) {
  const photo = page.locator('.carousel__item img').nth(index)
  const box = await photo.boundingBox()
  if (!box) throw new Error('사진 위치를 찾지 못했습니다')
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await expect(page.locator('.photo-lightbox')).toBeVisible()
  await page.mouse.up()
}

test('사진 꾹 누르면 원본 팝업 → 팝업 안에서 스와이프로 다음 사진', async ({ page }) => {
  await gotoPersonalHome(page)
  await addExerciseWithPhotos(page, 'E2E 사진운동', [PHOTO_1, PHOTO_2])

  // 운동 상세 진입
  await page.locator('.exercise-card', { hasText: 'E2E 사진운동' }).click()
  await expect(page.locator('.carousel__item img')).toHaveCount(2)

  // 캐러셀에서 보이는 사진은 4:3으로 잘려 있다(세로로 긴 원본이므로 높이가 원본 비율보다 작음)
  const heroImg = page.locator('.carousel__item img').first()
  const heroBox = await heroImg.boundingBox()
  expect(heroBox!.height).toBeLessThan(heroBox!.width * 4) // 원본은 1:4 세로 비율

  await longPressPhoto(page, 0)

  // 팝업에는 전체 사진이 캐러셀로 들어있고, 원본 비율(세로로 긴 형태) 그대로 보인다
  const lightboxImgs = page.locator('.photo-lightbox__img')
  await expect(lightboxImgs).toHaveCount(2)
  const openedBox = await lightboxImgs.first().boundingBox()
  expect(openedBox!.height).toBeGreaterThan(openedBox!.width) // contain이라 세로가 길다

  // 첫 번째 점이 활성
  await expect(page.locator('.photo-lightbox__dot')).toHaveCount(2)
  await expect(page.locator('.photo-lightbox__dot').first()).toHaveClass(/--active/)

  // 팝업 안에서 가로 스와이프 → 두 번째 사진
  const track = page.locator('.photo-lightbox__track')
  const trackBox = await track.boundingBox()
  await page.mouse.move(trackBox!.x + trackBox!.width / 2, trackBox!.y + trackBox!.height / 2)
  await page.mouse.wheel(trackBox!.width, 0)

  await expect(page.locator('.photo-lightbox__dot').nth(1)).toHaveClass(/--active/)
  await expect(page.locator('.photo-lightbox__dot').first()).not.toHaveClass(/--active/)

  // 실제로 두 번째 사진이 보이는 위치까지 스크롤됨 + 두 사진은 서로 다른 이미지
  const scrolled = await track.evaluate((el) => el.scrollLeft / el.clientWidth)
  expect(Math.round(scrolled)).toBe(1)
  const srcs = await lightboxImgs.evaluateAll((imgs) => imgs.map((i) => (i as HTMLImageElement).src))
  expect(srcs[0]).not.toBe(srcs[1])

  // 닫기
  await page.getByLabel('닫기').click()
  await expect(page.locator('.photo-lightbox')).toBeHidden()
})

test('두 번째 사진을 꾹 누르면 그 사진부터 열린다', async ({ page }) => {
  await gotoPersonalHome(page)
  await addExerciseWithPhotos(page, 'E2E 사진운동2', [PHOTO_1, PHOTO_2])

  await page.locator('.exercise-card', { hasText: 'E2E 사진운동2' }).click()

  // 캐러셀을 두 번째 사진으로 넘긴 뒤 꾹 누르기
  const carousel = page.locator('.carousel')
  const carouselBox = await carousel.boundingBox()
  await page.mouse.move(carouselBox!.x + carouselBox!.width / 2, carouselBox!.y + carouselBox!.height / 2)
  await page.mouse.wheel(carouselBox!.width, 0)
  await expect(page.locator('.carousel__dot').nth(1)).toHaveClass(/--active/)

  await longPressPhoto(page, 1)

  // 눌렀던 두 번째 사진 위치에서 열린다
  await expect(page.locator('.photo-lightbox__dot').nth(1)).toHaveClass(/--active/)
  const track = page.locator('.photo-lightbox__track')
  const scrolled = await track.evaluate((el) => el.scrollLeft / el.clientWidth)
  expect(Math.round(scrolled)).toBe(1)
})

test('짧게 탭하면 팝업이 열리지 않는다', async ({ page }) => {
  await gotoPersonalHome(page)
  await addExerciseWithPhotos(page, 'E2E 사진운동3', [PHOTO_1])

  await page.locator('.exercise-card', { hasText: 'E2E 사진운동3' }).click()
  await page.locator('.carousel__item img').first().click()

  await expect(page.locator('.photo-lightbox')).toHaveCount(0)
})
