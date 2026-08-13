import { test, expect } from '@playwright/test'
import { gotoPersonalHome } from './helpers.ts'

// 읽기가 실패했을 때 앱이 어떻게 보이는지. 유닛은 repo를 모킹해 실패를 만들지만
// 여기서는 진짜 IndexedDB에 진짜 값을 넣고 앱을 통째로 다시 열어 확인한다.

// 초안을 appConfig에 직접 써넣는다. 백업 복원이 하는 일과 같다
// (복원은 파일에 있는 appConfig 행을 그대로 put 한다).
async function putRawDraft(page: import('@playwright/test').Page, form: unknown) {
  await page.evaluate(async (value) => {
    await new Promise<void>((resolve, reject) => {
      const open = indexedDB.open('repia-db')
      open.onerror = () => reject(open.error)
      open.onsuccess = () => {
        const db = open.result
        const tx = db.transaction('appConfig', 'readwrite')
        tx.objectStore('appConfig').put({
          key: 'logDraft',
          value: { savedAt: new Date().toISOString(), form: value },
        })
        tx.oncomplete = () => {
          db.close()
          resolve()
        }
        tx.onerror = () => reject(tx.error)
      }
    })
  }, form)
}

test('망가진 초안이 남아 있어도 기록 추가 화면이 열린다', async ({ page }) => {
  await gotoPersonalHome(page)

  // exercises가 없는 초안 — 읽는 쪽에서 .length를 부르다 예외가 났다.
  // 예전에는 이 화면이 「불러오는 중...」에서 멈췄고, 초안을 지울 UI가 없어
  // 전체 초기화 말고는 기록을 새로 쓸 방법이 없었다.
  await putRawDraft(page, { title: '망가진 초안' })

  await page.goto('/logs/new')

  await expect(page.getByRole('button', { name: '저장' })).toBeVisible({ timeout: 5_000 })
  await expect(page.getByText('불러오는 중...')).toHaveCount(0)
  await expect(page.getByText('기록을 불러오지 못했습니다.')).toHaveCount(0)
  // 복구할 게 없으니 묻지도 않는다
  await expect(page.getByText('작성 중이던 기록이 있어요')).toHaveCount(0)
})

test('망가진 초안은 조용히 정리돼 다음에 또 걸리지 않는다', async ({ page }) => {
  await gotoPersonalHome(page)
  await putRawDraft(page, { title: '망가진 초안' })

  await page.goto('/logs/new')
  await expect(page.getByRole('button', { name: '저장' })).toBeVisible({ timeout: 5_000 })

  const left = await page.evaluate(async () => {
    return new Promise<unknown>((resolve, reject) => {
      const open = indexedDB.open('repia-db')
      open.onerror = () => reject(open.error)
      open.onsuccess = () => {
        const db = open.result
        const req = db.transaction('appConfig').objectStore('appConfig').get('logDraft')
        req.onsuccess = () => {
          db.close()
          resolve((req.result as { value?: unknown } | undefined)?.value ?? null)
        }
        req.onerror = () => reject(req.error)
      }
    })
  })
  expect(left).toBeNull()
})
