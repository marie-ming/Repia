import type { Exercise, RoutineLog, ExerciseMetric, SetEntry } from '../db/types.ts'
import {
  EXERCISE_CATEGORY_LABELS,
  EQUIPMENT_LABELS,
  EXERCISE_METRIC_LABELS,
  formatDuration,
  gripLabel,
} from '../constants.ts'
import { formatDotDate } from './date.ts'

const TEXT = '#ffffff'
const DIM = '#9aa0b0'
const ACCENT = '#e94560' // 브랜드 강조색(기록 숫자)
const PILL_BG = 'rgba(233, 69, 96, 0.18)'

// 세트 값을 숫자(강조)/단위로 분리
function setSegmentsColor(metric: ExerciseMetric, s: SetEntry): { t: string; num: boolean }[] {
  switch (metric) {
    case 'reps':
      return [
        { t: `${s.reps}`, num: true },
        { t: '회', num: false },
      ]
    case 'time':
      return [{ t: formatDuration(s.seconds ?? 0), num: true }]
    case 'distance_time':
      return [
        { t: `${s.distance ?? 0}`, num: true },
        { t: 'km·', num: false },
        { t: formatDuration(s.seconds ?? 0), num: true },
      ]
    default:
      return [
        { t: `${s.weight}`, num: true },
        { t: `kg×${s.reps}`, num: false },
      ]
  }
}

const W = 800
const PAD = 48
const FOOTER_H = 44
const FONT = 'Pretendard, -apple-system, system-ui, sans-serif'

// 둥근 배지(칩) 그리기, 다음 x 위치 반환
function drawPill(
  ctx: CanvasRenderingContext2D,
  x: number,
  cy: number,
  text: string,
  fontSize: number,
): number {
  ctx.font = `600 ${fontSize}px ${FONT}`
  const padX = 12
  const w = ctx.measureText(text).width + padX * 2
  const h = fontSize + 10
  ctx.beginPath()
  ctx.roundRect(x, cy - h / 2, w, h, 7)
  ctx.fillStyle = PILL_BG
  ctx.fill()
  ctx.textBaseline = 'middle'
  ctx.fillStyle = ACCENT
  ctx.fillText(text, x + padX, cy + 1)
  ctx.textBaseline = 'top'
  return w
}

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

async function fontsReady() {
  try {
    await document.fonts.ready
  } catch {
    /* 폰트 준비 실패 시 fallback 글꼴로 진행 */
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

// 운동 정보를 공유용 PNG로 (최근 기록 제외, 사진 최대 2장)
export async function generateExerciseShareImage(ex: Exercise): Promise<Blob> {
  await fontsReady()

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

// 운동 기록(RoutineLog)을 공유용 PNG로 (기록 상세 화면과 동일한 형태)
export async function generateRoutineLogShareImage(
  log: RoutineLog,
  exercises: Exercise[],
): Promise<Blob> {
  await fontsReady()

  const byId = new Map(exercises.map((e) => [e.id, e]))
  const m = document.createElement('canvas').getContext('2d')!
  const contentW = W - PAD * 2

  // 글꼴/높이 상수
  const TITLE = 44
  const META = 25
  const EXNAME = 29
  const NUM = 25 // 세트 숫자
  const UNIT = NUM // 단위/기호도 같은 크기(강조는 색·굵기로만)
  const MEMO = 24
  const TITLE_LH = TITLE * 1.3
  const META_LH = META * 1.6
  const EXNAME_LH = EXNAME * 1.34
  const SETS_LH = NUM * 1.5
  const MEMO_LH = MEMO * 1.45
  const NUMF = `600 ${NUM}px ${FONT}`
  const UNITF = `500 ${UNIT}px ${FONT}`

  const NAME_GAP = 4
  const EX_GAP = 22

  // 세트 한 칸 폭(숫자/단위 폰트 반영)
  const measureSet = (metric: ExerciseMetric, s: SetEntry) => {
    let w = 0
    for (const seg of setSegmentsColor(metric, s)) {
      m.font = seg.num ? NUMF : UNITF
      w += m.measureText(seg.t).width
    }
    return w
  }

  // 운동별 세트를 ' · ' 단위로 줄바꿈(토막 안 쪼개짐). 각 줄 = 세트 인덱스 목록
  const SEP = '   ·   '
  m.font = UNITF
  const sepW = m.measureText(SEP).width
  const setsLinesByEx = log.exercises.map((r): number[][] => {
    if (!r.sets.length) return []
    const metric = byId.get(r.exerciseId)?.metric ?? 'weight_reps'
    const lines: number[][] = []
    let cur: number[] = []
    let curW = 0
    r.sets.forEach((s, si) => {
      const w = measureSet(metric, s)
      const add = (cur.length ? sepW : 0) + w
      if (cur.length && curW + add > contentW) {
        lines.push(cur)
        cur = []
        curW = 0
      }
      cur.push(si)
      curW += (cur.length > 1 ? sepW : 0) + w
    })
    if (cur.length) lines.push(cur)
    return lines
  })

  // 메모 줄바꿈 미리 측정
  let memoLines: string[] = []
  if (log.memo) {
    m.font = `400 ${MEMO}px ${FONT}`
    memoLines = wrapText(m, log.memo, contentW)
  }

  const title = log.title || '운동 기록'

  // 부위 태그 (각 운동 첫 카테고리, 중복 제거)
  const tags = ((): string[] => {
    const out: string[] = []
    const seen = new Set<string>()
    for (const r of log.exercises) {
      const c = byId.get(r.exerciseId)?.categories[0]
      if (c && !seen.has(c)) {
        seen.add(c)
        out.push(c)
      }
    }
    return out
  })()
  const TAG_LH = 40
  m.font = `700 ${TITLE}px ${FONT}`
  const titleW = m.measureText(title).width
  let pillsW = 0
  for (const c of tags) {
    m.font = `600 20px ${FONT}`
    pillsW += m.measureText(EXERCISE_CATEGORY_LABELS[c as keyof typeof EXERCISE_CATEGORY_LABELS]).width + 24 + 6
  }
  const tagsInline = tags.length === 0 || PAD + titleW + 14 + pillsW <= W - PAD

  // 높이 계산 (제목/운동명은 한 줄 가정)
  let height = PAD + TITLE_LH
  if (tags.length && !tagsInline) height += TAG_LH
  height += 14 + META_LH + 26
  if (log.exercises.length === 0) {
    height += META_LH
  } else {
    log.exercises.forEach((_r, i) => {
      height += EXNAME_LH + NAME_GAP + setsLinesByEx[i].length * SETS_LH
      if (i < log.exercises.length - 1) height += EX_GAP
    })
  }
  if (memoLines.length) height += 26 + memoLines.length * MEMO_LH
  height += PAD + FOOTER_H

  const { canvas, ctx } = makeCanvas(height)
  ctx.textBaseline = 'top'

  let y = PAD

  // 제목 + 부위 태그
  ctx.font = `700 ${TITLE}px ${FONT}`
  ctx.fillStyle = TEXT
  ctx.fillText(title, PAD, y)
  const drawTags = (tx0: number, cy: number) => {
    let tx = tx0
    for (const c of tags) {
      tx += drawPill(ctx, tx, cy, EXERCISE_CATEGORY_LABELS[c as keyof typeof EXERCISE_CATEGORY_LABELS], 20) + 6
    }
  }
  if (tagsInline) {
    if (tags.length) drawTags(PAD + titleW + 14, y + TITLE * 0.62)
    y += TITLE_LH + 14
  } else {
    y += TITLE_LH
    drawTags(PAD, y + TAG_LH / 2 - 4)
    y += TAG_LH + 14
  }

  // 날짜 · 시간
  ctx.font = `400 ${META}px ${FONT}`
  ctx.fillStyle = '#c9c9d4'
  ctx.fillText(`${formatDotDate(log.date)}${log.time ? ` · ${log.time}` : ''}`, PAD, y)
  y += META_LH + 26

  // 운동별 (운동명 흰색 + 세트는 숫자만 컬러 강조)
  if (log.exercises.length === 0) {
    ctx.font = `400 ${META}px ${FONT}`
    ctx.fillStyle = '#a7a7b4'
    ctx.fillText('기록된 운동이 없습니다.', PAD, y)
    y += META_LH
  } else {
    log.exercises.forEach((r, i) => {
      const ex = byId.get(r.exerciseId)
      const metric = ex?.metric ?? 'weight_reps'

      // 운동명 (흰색)
      ctx.textBaseline = 'top'
      ctx.font = `600 ${EXNAME}px ${FONT}`
      ctx.fillStyle = TEXT
      ctx.fillText(ex?.name ?? '(삭제된 운동)', PAD, y)
      y += EXNAME_LH + NAME_GAP

      // 세트: 숫자=브랜드 컬러, 단위/기호=회색
      for (const line of setsLinesByEx[i]) {
        const base = y + NUM
        ctx.textBaseline = 'alphabetic'
        let sx = PAD
        line.forEach((si, k) => {
          if (k > 0) {
            ctx.font = UNITF
            ctx.fillStyle = DIM
            ctx.fillText(SEP, sx, base)
            sx += ctx.measureText(SEP).width
          }
          for (const seg of setSegmentsColor(metric, r.sets[si])) {
            if (seg.num) {
              ctx.font = NUMF
              ctx.fillStyle = ACCENT
            } else {
              ctx.font = UNITF
              ctx.fillStyle = DIM
            }
            ctx.fillText(seg.t, sx, base)
            sx += ctx.measureText(seg.t).width
          }
        })
        ctx.textBaseline = 'top'
        y += SETS_LH
      }
      if (i < log.exercises.length - 1) y += EX_GAP
    })
  }

  // 메모
  if (memoLines.length) {
    y += 26
    ctx.textBaseline = 'top'
    ctx.font = `400 ${MEMO}px ${FONT}`
    ctx.fillStyle = '#a7a7b4'
    for (const l of memoLines) {
      ctx.fillText(l, PAD, y)
      y += MEMO_LH
    }
  }

  drawFooter(ctx, height)
  return toBlob(canvas)
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((res, rej) => {
    canvas.toBlob((b) => (b ? res(b) : rej(new Error('이미지 생성 실패'))), 'image/png')
  })
}
