import type { Exercise } from '../db/types.ts'
import {
  EXERCISE_CATEGORY_LABELS,
  EQUIPMENT_LABELS,
  EXERCISE_METRIC_LABELS,
  gripLabel,
} from '../constants.ts'

const W = 800
const PAD = 48
const FOOTER_H = 44
const FONT = 'Pretendard, -apple-system, system-ui, sans-serif'

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

interface TextLine {
  text: string
  font: string
  color: string
  h: number
}

interface InfoOpts {
  nameSize: number
  metaSize: number
  desc?: string
  descSize?: number
}

// 이름 + 메타(+선택적 설명)를 주어진 폭에 맞춰 줄 목록 + 총 높이로
function buildInfo(
  m: CanvasRenderingContext2D,
  width: number,
  name: string,
  metaTexts: string[],
  opts: InfoOpts,
): { lines: (TextLine | { gap: number })[]; totalH: number } {
  const lines: (TextLine | { gap: number })[] = []
  const nameFont = `700 ${opts.nameSize}px ${FONT}`
  m.font = nameFont
  for (const l of wrapText(m, name, width)) {
    lines.push({ text: l, font: nameFont, color: '#ffffff', h: opts.nameSize * 1.26 })
  }
  lines.push({ gap: 14 })
  const metaFont = `400 ${opts.metaSize}px ${FONT}`
  m.font = metaFont
  for (const t of metaTexts) {
    for (const l of wrapText(m, t, width)) {
      lines.push({ text: l, font: metaFont, color: '#c9c9d4', h: opts.metaSize * 1.6 })
    }
  }
  if (opts.desc) {
    const ds = opts.descSize ?? 24
    const descFont = `400 ${ds}px ${FONT}`
    m.font = descFont
    lines.push({ gap: 22 })
    for (const l of wrapText(m, opts.desc, width)) {
      lines.push({ text: l, font: descFont, color: '#a7a7b4', h: ds * 1.4 })
    }
  }
  const totalH = lines.reduce((s, l) => s + ('gap' in l ? l.gap : l.h), 0)
  return { lines, totalH }
}

function drawLines(
  ctx: CanvasRenderingContext2D,
  x: number,
  startY: number,
  lines: (TextLine | { gap: number })[],
) {
  let y = startY
  for (const l of lines) {
    if ('gap' in l) {
      y += l.gap
      continue
    }
    ctx.font = l.font
    ctx.fillStyle = l.color
    ctx.fillText(l.text, x, y)
    y += l.h
  }
}

// 운동 정보를 공유용 PNG로 (최근 기록 제외, 사진 최대 2장)
export async function generateExerciseShareImage(ex: Exercise): Promise<Blob> {
  try {
    await document.fonts.ready
  } catch {
    /* 폰트 준비 실패 시 fallback 글꼴로 진행 */
  }

  const loaded = (await Promise.all(ex.photos.slice(0, 2).map(loadImage))).filter(
    (i): i is HTMLImageElement => i !== null,
  )

  const metaTexts: string[] = []
  if (ex.categories.length > 0) {
    metaTexts.push(`카테고리   ${ex.categories.map((c) => EXERCISE_CATEGORY_LABELS[c]).join(', ')}`)
  }
  if (ex.equipment) metaTexts.push(`장비   ${EQUIPMENT_LABELS[ex.equipment]}`)
  const g = gripLabel(ex.grip)
  if (g) metaTexts.push(`그립   ${g}`)
  metaTexts.push(`측정   ${EXERCISE_METRIC_LABELS[ex.metric]}`)

  const m = document.createElement('canvas').getContext('2d')!
  const contentW = W - PAD * 2

  // 설명(있으면): 항상 전체폭 본문으로
  const DESC_SIZE = 26
  const DESC_LH = DESC_SIZE * 1.4
  const descFont = `400 ${DESC_SIZE}px ${FONT}`
  let descLines: string[] = []
  if (ex.description) {
    m.font = descFont
    descLines = wrapText(m, ex.description, contentW)
  }
  const descBlockH = descLines.length ? 28 + descLines.length * DESC_LH : 0

  function drawDesc(ctx: CanvasRenderingContext2D, topY: number) {
    if (!descLines.length) return
    let y = topY + 28
    ctx.font = descFont
    ctx.fillStyle = '#a7a7b4'
    for (const l of descLines) {
      ctx.fillText(l, PAD, y)
      y += DESC_LH
    }
  }

  function makeCanvas(height: number) {
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = height
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#16161f'
    ctx.fillRect(0, 0, W, height)
    ctx.textBaseline = 'top'
    return { canvas, ctx }
  }

  function drawFooter(ctx: CanvasRenderingContext2D, height: number, x = PAD) {
    ctx.fillStyle = '#e94560'
    ctx.font = `700 26px ${FONT}`
    ctx.fillText('Repia', x, height - PAD - 4)
  }

  if (loaded.length === 2) {
    // 사진 좌측(카드 가장자리까지 꽉 채움) / 정보·설명·푸터 우측
    const COL_GAP = 32
    const photoColW = 330
    const PHOTO_GAP = 10
    const MIN_BAND = 392
    const infoX = photoColW + COL_GAP
    const infoW = W - PAD - infoX // 800-48-362 = 390
    const info = buildInfo(m, infoW, ex.name, metaTexts, {
      nameSize: 38,
      metaSize: 24,
      desc: ex.description,
      descSize: 23,
    })

    const height = PAD + Math.max(info.totalH, MIN_BAND) + PAD + FOOTER_H
    const { canvas, ctx } = makeCanvas(height)

    // 사진은 위/아래/왼쪽 여백 없이 카드 전체 높이를 채움
    const ph = (height - PHOTO_GAP) / 2
    coverDraw(ctx, loaded[0], 0, 0, photoColW, ph)
    coverDraw(ctx, loaded[1], 0, ph + PHOTO_GAP, photoColW, ph)
    drawLines(ctx, infoX, PAD, info.lines)
    drawFooter(ctx, height, infoX)
    return toBlob(canvas)
  }

  // 0~1장: 사진 위(전체폭 4:3) + 정보 아래(전체폭)
  const photoH = loaded.length === 1 ? Math.round((W * 3) / 4) : 0
  const info = buildInfo(m, contentW, ex.name, metaTexts, { nameSize: 46, metaSize: 26 })
  const infoStartY = (photoH || PAD) + PAD
  const height = infoStartY + info.totalH + descBlockH + PAD + FOOTER_H
  const { canvas, ctx } = makeCanvas(height)

  if (photoH) coverDraw(ctx, loaded[0], 0, 0, W, photoH)
  drawLines(ctx, PAD, infoStartY, info.lines)
  drawDesc(ctx, infoStartY + info.totalH)
  drawFooter(ctx, height)
  return toBlob(canvas)
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((res, rej) => {
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('이미지 생성 실패'))), 'image/png')
  })
}
