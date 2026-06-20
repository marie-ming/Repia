import { describe, expect, it } from 'vitest'
import {
  EQUIPMENT_LABELS,
  EQUIPMENT_OPTIONS,
  EXERCISE_CATEGORY_LABELS,
  EXERCISE_CATEGORY_OPTIONS,
  MEMBER_STATUS_OPTIONS,
  SESSION_STATUS_LABELS,
  SESSION_STATUS_OPTIONS,
  gripLabel,
  formatDuration,
  bestSetLabel,
} from './constants.ts'

describe('회원 상태', () => {
  it('active와 ended 두 가지', () => {
    expect(MEMBER_STATUS_OPTIONS.map((o) => o.value)).toEqual(['active', 'ended'])
  })
})

describe('수업 상태', () => {
  it('options와 labels가 동일한 한글 라벨을 사용', () => {
    for (const opt of SESSION_STATUS_OPTIONS) {
      expect(SESSION_STATUS_LABELS[opt.value]).toBe(opt.label)
    }
  })
  it('3가지: reserved / completed / cancelled', () => {
    expect(SESSION_STATUS_OPTIONS.map((o) => o.value).sort()).toEqual([
      'cancelled',
      'completed',
      'reserved',
    ])
  })
})

describe('운동 카테고리', () => {
  it('options와 labels가 일치 (legacy arm 제외)', () => {
    for (const opt of EXERCISE_CATEGORY_OPTIONS) {
      expect(EXERCISE_CATEGORY_LABELS[opt.value]).toBe(opt.label)
    }
  })

  it('legacy "arm" 라벨이 "팔"로 fallback 유지', () => {
    expect(EXERCISE_CATEGORY_LABELS.arm).toBe('팔')
  })

  it('팔 세부(이두/삼두/전완)가 모두 포함', () => {
    const values = EXERCISE_CATEGORY_OPTIONS.map((o) => o.value)
    expect(values).toContain('biceps')
    expect(values).toContain('triceps')
    expect(values).toContain('forearm')
  })

  it('options에는 legacy arm이 없음 (새 등록에서 선택 불가)', () => {
    const values = EXERCISE_CATEGORY_OPTIONS.map((o) => o.value)
    expect(values).not.toContain('arm')
  })
})

describe('장비', () => {
  it('options에 정의된 모든 값이 LABELS에 존재', () => {
    for (const opt of EQUIPMENT_OPTIONS) {
      expect(EQUIPMENT_LABELS[opt.value]).toBe(opt.label)
    }
  })

  it('맨몸/바벨/덤벨/케틀벨/머신/케이블/밴드/기타 포함', () => {
    expect(EQUIPMENT_OPTIONS.map((o) => o.value)).toEqual([
      'bodyweight',
      'barbell',
      'dumbbell',
      'kettlebell',
      'machine',
      'cable',
      'band',
      'etc',
    ])
  })
})

describe('gripLabel', () => {
  it('legacy 코드를 한글로 매핑', () => {
    expect(gripLabel('overhand')).toBe('오버핸드')
    expect(gripLabel('underhand')).toBe('언더핸드')
    expect(gripLabel('neutral')).toBe('뉴트럴')
    expect(gripLabel('etc')).toBe('기타')
  })

  it('legacy "none"은 빈 문자열', () => {
    expect(gripLabel('none')).toBe('')
  })

  it('legacy 코드가 아닌 자유 입력은 그대로 반환', () => {
    expect(gripLabel('와이드 그립')).toBe('와이드 그립')
    expect(gripLabel('')).toBe('')
  })
})

describe('formatDuration', () => {
  it('초를 m:ss로', () => {
    expect(formatDuration(0)).toBe('0:00')
    expect(formatDuration(45)).toBe('0:45')
    expect(formatDuration(90)).toBe('1:30')
    expect(formatDuration(605)).toBe('10:05')
  })
})

describe('bestSetLabel', () => {
  it('빈 배열이면 null', () => {
    expect(bestSetLabel('weight_reps', [])).toBeNull()
  })
  it('weight_reps 최고 중량', () => {
    expect(
      bestSetLabel('weight_reps', [
        { weight: 80, reps: 5 },
        { weight: 120, reps: 3 },
      ]),
    ).toBe('최고 120kg')
  })
  it('reps 최고 횟수', () => {
    expect(bestSetLabel('reps', [{ weight: 0, reps: 12 }, { weight: 0, reps: 20 }])).toBe('최고 20회')
  })
  it('time 최장 시간', () => {
    expect(bestSetLabel('time', [{ weight: 0, reps: 0, seconds: 45 }, { weight: 0, reps: 0, seconds: 90 }])).toBe(
      '최장 1:30',
    )
  })
  it('distance_time 최장 거리', () => {
    expect(
      bestSetLabel('distance_time', [{ weight: 0, reps: 0, distance: 3, seconds: 1200 }]),
    ).toBe('최장 3km')
  })
})
