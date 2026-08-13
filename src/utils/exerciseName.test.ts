import { describe, expect, it } from 'vitest'
import { isDuplicateExerciseName, normalizeExerciseName } from './exerciseName.ts'

const ex = (id: string, name: string) => ({ id, name })

describe('normalizeExerciseName', () => {
  it('앞뒤 공백을 없앤다', () => {
    expect(normalizeExerciseName('  데드리프트  ')).toBe('데드리프트')
  })

  // 띄어쓰기는 사람마다, 그날그날 다르다
  it('중간 공백도 없앤다', () => {
    expect(normalizeExerciseName('데드 리프트')).toBe('데드리프트')
    expect(normalizeExerciseName('바벨 벤치 프레스')).toBe('바벨벤치프레스')
  })

  it('공백이 여러 칸이어도 같게 본다', () => {
    expect(normalizeExerciseName('데드   리프트')).toBe('데드리프트')
  })

  it('탭·줄바꿈도 공백으로 취급한다', () => {
    expect(normalizeExerciseName('데드\t리프트')).toBe('데드리프트')
    expect(normalizeExerciseName('데드\n리프트')).toBe('데드리프트')
  })

  it('공백만 있으면 빈 문자열', () => {
    expect(normalizeExerciseName('   ')).toBe('')
  })

  it('대소문자를 맞춘다', () => {
    expect(normalizeExerciseName('Lat Pulldown')).toBe('latpulldown')
    expect(normalizeExerciseName('LAT PULLDOWN')).toBe('latpulldown')
  })

  it('한글은 소문자화에 영향받지 않는다', () => {
    expect(normalizeExerciseName('데드리프트')).toBe('데드리프트')
  })
})

describe('isDuplicateExerciseName', () => {
  const list = [ex('e1', '데드리프트'), ex('e2', '벤치프레스')]

  it('같은 이름이면 중복', () => {
    expect(isDuplicateExerciseName('데드리프트', list)).toBe(true)
  })

  it('띄어쓰기만 다르면 중복', () => {
    expect(isDuplicateExerciseName('데드 리프트', list)).toBe(true)
    expect(isDuplicateExerciseName('  데드 리프트  ', list)).toBe(true)
  })

  it('저장된 쪽에 띄어쓰기가 있어도 잡는다', () => {
    expect(isDuplicateExerciseName('벤치프레스', [ex('e1', '벤치 프레스')])).toBe(true)
  })

  it('다른 이름이면 중복 아님', () => {
    expect(isDuplicateExerciseName('루마니안 데드리프트', list)).toBe(false)
    expect(isDuplicateExerciseName('스쿼트', list)).toBe(false)
  })

  it('빈 이름은 중복으로 보지 않는다 (빈 이름은 별개 문제)', () => {
    expect(isDuplicateExerciseName('', list)).toBe(false)
    expect(isDuplicateExerciseName('   ', list)).toBe(false)
  })

  // 자기 자신을 세면 이름을 안 바꾼 수정이 통째로 막힌다
  it('exceptId로 지정한 항목은 세지 않는다', () => {
    expect(isDuplicateExerciseName('데드리프트', list, 'e1')).toBe(false)
    expect(isDuplicateExerciseName('데드 리프트', list, 'e1')).toBe(false)
  })

  it('exceptId가 있어도 다른 항목과 겹치면 중복', () => {
    expect(isDuplicateExerciseName('벤치프레스', list, 'e1')).toBe(true)
  })

  it('목록이 비어 있으면 중복 아님', () => {
    expect(isDuplicateExerciseName('데드리프트', [])).toBe(false)
  })

  // 띄어쓰기와 같은 성격 — 「Lat Pulldown」과 「lat pulldown」은 같은 운동이다
  it('대소문자만 다르면 중복', () => {
    expect(isDuplicateExerciseName('Lat Pulldown', [ex('e1', 'lat pulldown')])).toBe(true)
    expect(isDuplicateExerciseName('LAT PULLDOWN', [ex('e1', 'Lat Pulldown')])).toBe(true)
  })

  it('대소문자와 띄어쓰기가 함께 달라도 중복', () => {
    expect(isDuplicateExerciseName('latpulldown', [ex('e1', 'Lat Pulldown')])).toBe(true)
    expect(isDuplicateExerciseName('EZ바 컬', [ex('e1', 'ez바컬')])).toBe(true)
  })
})
