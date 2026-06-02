import { describe, expect, it } from 'vitest'
import { formatPhone } from './phone.ts'

describe('formatPhone', () => {
  describe('휴대폰 (3자리 국번)', () => {
    it('빈 문자열은 그대로 빈 문자열', () => {
      expect(formatPhone('')).toBe('')
    })

    it('3자리까지는 하이픈 없이', () => {
      expect(formatPhone('0')).toBe('0')
      expect(formatPhone('01')).toBe('01')
      expect(formatPhone('010')).toBe('010')
    })

    it('4~7자리: 국번 뒤에 하이픈', () => {
      expect(formatPhone('0101')).toBe('010-1')
      expect(formatPhone('0101234')).toBe('010-1234')
    })

    it('11자리: 010-1234-5678', () => {
      expect(formatPhone('01012345678')).toBe('010-1234-5678')
    })

    it('10자리: 010-123-4567 (구형 휴대폰 번호)', () => {
      expect(formatPhone('0101234567')).toBe('010-123-4567')
    })

    it('11자리 초과는 잘림', () => {
      expect(formatPhone('010123456789')).toBe('010-1234-5678')
    })

    it('하이픈이 포함된 입력도 정상 처리', () => {
      expect(formatPhone('010-1234-5678')).toBe('010-1234-5678')
    })

    it('숫자가 아닌 문자는 무시', () => {
      expect(formatPhone('010 1234 5678')).toBe('010-1234-5678')
      expect(formatPhone('abc010def1234ghi5678')).toBe('010-1234-5678')
    })
  })

  describe('서울 (02)', () => {
    it('02만 입력', () => {
      expect(formatPhone('02')).toBe('02')
    })

    it('5자리까지: 02-XXX', () => {
      expect(formatPhone('02123')).toBe('02-123')
      expect(formatPhone('021234')).toBe('02-123-4') // 6자리부터는 3 split
    })

    it('9자리: 02-123-4567', () => {
      expect(formatPhone('021234567')).toBe('02-123-4567')
    })

    it('10자리: 02-1234-5678', () => {
      expect(formatPhone('0212345678')).toBe('02-1234-5678')
    })
  })

  describe('기타 지역 (031, 051 등)', () => {
    it('10자리: 031-123-4567', () => {
      expect(formatPhone('0311234567')).toBe('031-123-4567')
    })

    it('11자리: 031-1234-5678', () => {
      expect(formatPhone('03112345678')).toBe('031-1234-5678')
    })
  })

  describe('점진적 입력', () => {
    it('한 글자씩 늘어날 때마다 올바르게 포맷', () => {
      const sequence = '01012345678'
      const expected = [
        '0',
        '01',
        '010',
        '010-1',
        '010-12',
        '010-123',
        '010-1234',
        '010-1234-5',
        '010-1234-56',
        '010-123-4567', // 10자리: 3-3-4 포맷 (구형 휴대폰 길이)
        '010-1234-5678', // 11자리: 3-4-4 포맷
      ]
      expected.forEach((want, i) => {
        expect(formatPhone(sequence.slice(0, i + 1))).toBe(want)
      })
    })
  })
})
