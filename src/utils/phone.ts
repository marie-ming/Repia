// 한국 전화번호를 입력 도중에도 적절히 하이픈으로 포맷한다.
// 휴대폰: 010-XXXX-XXXX / 011-XXX-XXXX 등
// 서울:   02-XXXX-XXXX / 02-XXX-XXXX
// 기타:   0XX-XXXX-XXXX / 0XX-XXX-XXXX
export function formatPhone(input: string): string {
  const digits = input.replace(/\D/g, '').slice(0, 11)
  if (digits.length === 0) return ''

  // 서울 (02)
  if (digits.startsWith('02')) {
    if (digits.length <= 2) return digits
    if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`
    if (digits.length <= 9) return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6, 10)}`
  }

  // 휴대폰/기타 (3자리 국번)
  if (digits.length <= 3) return digits
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
}
