import type { Exercise } from '../db/types.ts'
import {
  EXERCISE_CATEGORY_LABELS,
  EQUIPMENT_LABELS,
  EXERCISE_METRIC_LABELS,
  gripLabel,
} from '../constants.ts'

const W = 800
const PAD = 48
const FONT = "Pretendard, -apple-system, system-ui, sans-serif"

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((res) => {
    const img = new Image()
    img.onload = () => res(img)
    img.onerror = () => res(null)
    img.src = src
  })
}

// 영역에 꽉 차게(cover) 그리기 + 클리핑
function coverDraw(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const r = Math.max(w / img.width, h / img.height)
  const dw = img.width * r
  const dh = img.height * r
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
  ctx.restore()
}

// 한글은 문자 단위로 줄바꿈
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const out: string[] = []
  for (const para of text.split('\n')) {
    let line = ''
    for (const ch of para) {
      if (line && ctx.measureText(line + ch).width > maxW) {
        out.push(line)
        line = ch
      } else {
        line += ch
      }
    }
    out.push(line)
  }
  return out
}

// 운동 정보를 공유용 PNG로 (최근 기록 제외)
export async function generateExerciseShareImage(ex: Exercise): Promise<Blob> {
  try {
    await document.fonts.ready
  } catch {
    /* 폰트 준비 실패 시 fallback 글꼴로 진행 */
  }

  // 대표 1장 + 추가 최대 3장
  const loaded = (await Promise.all(ex.photos.slice(0, 4).map(loadImage))).filter(
    (i): i is HTMLImageElement => i !== null,
  )
  const photo = loaded[0] ?? null
  const thumbs = loaded.slice(1)
  const contentW = W - PAD * 2

  const measure = document.createElement('canvas').getContext('2d')!

  measure.font = `700 46px ${FONT}`
  const nameLines = wrapText(measure, ex.name, contentW)

  const metaLines: string[] = []
  if (ex.categories.length > 0) {
    metaLines.push(`카테고리   ${ex.categories.map((c) => EXERCISE_CATEGORY_LABELS[c]).join(', ')}`)
  }
  if (ex.equipment) metaLines.push(`장비   ${EQUIPMENT_LABELS[ex.equipment]}`)
  const g = gripLabel(ex.grip)
  if (g) metaLines.push(`그립   ${g}`)
  metaLines.push(`측정   ${EXERCISE_METRIC_LABELS[ex.metric]}`)

  let descLines: string[] = []
  if (ex.description) {
    measure.font = `400 26px ${FONT}`
    descLines = wrapText(measure, ex.description, contentW)
  }

  const photoH = photo ? Math.round(W * 0.6) : 0
  const THUMB_GAP = 12
  const thumbH = thumbs.length ? 170 : 0
  const thumbAreaH = thumbs.length ? THUMB_GAP + thumbH : 0
  const nameH = nameLines.length * 58
  const metaH = metaLines.length * 42
  const descH = descLines.length ? 28 + descLines.length * 36 : 0
  const height =
    (photo ? photoH + thumbAreaH : PAD) + PAD + nameH + 12 + metaH + descH + PAD + 44

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = height
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#16161f'
  ctx.fillRect(0, 0, W, height)
  ctx.textBaseline = 'top'

  let y = 0
  if (photo) {
    coverDraw(ctx, photo, 0, 0, W, photoH)
    y = photoH
    if (thumbs.length) {
      y += THUMB_GAP
      const tw = (contentW - THUMB_GAP * (thumbs.length - 1)) / thumbs.length
      thumbs.forEach((t, i) => {
        coverDraw(ctx, t, PAD + i * (tw + THUMB_GAP), y, tw, thumbH)
      })
      y += thumbH
    }
  } else {
    y = PAD
  }
  y += PAD

  ctx.fillStyle = '#ffffff'
  ctx.font = `700 46px ${FONT}`
  for (const l of nameLines) {
    ctx.fillText(l, PAD, y)
    y += 58
  }
  y += 12

  ctx.font = `400 26px ${FONT}`
  ctx.fillStyle = '#c9c9d4'
  for (const l of metaLines) {
    ctx.fillText(l, PAD, y)
    y += 42
  }

  if (descLines.length) {
    y += 28
    ctx.fillStyle = '#a7a7b4'
    ctx.font = `400 26px ${FONT}`
    for (const l of descLines) {
      ctx.fillText(l, PAD, y)
      y += 36
    }
  }

  ctx.fillStyle = '#e94560'
  ctx.font = `700 26px ${FONT}`
  ctx.fillText('Repia', PAD, height - PAD - 4)

  return new Promise<Blob>((res, rej) => {
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('이미지 생성 실패'))), 'image/png')
  })
}
