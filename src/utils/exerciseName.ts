// 「데드리프트」와 「데드 리프트」, 「Lat Pulldown」과 「lat pulldown」은 같은 운동인데
// 띄어쓰기도 대소문자도 사람마다, 그날그날 다르다.
// 비교할 때만 걷어낸다 — 저장은 사용자가 적은 그대로 둔다.
export function normalizeExerciseName(name: string): string {
  return name.replace(/\s+/g, '').toLowerCase()
}

// 이미 있는 이름인지. exceptId는 수정 중인 자기 자신을 빼기 위한 것으로,
// 없으면 이름을 안 바꾼 수정이 통째로 막힌다.
export function isDuplicateExerciseName(
  name: string,
  exercises: { id: string; name: string }[],
  exceptId?: string,
): boolean {
  const target = normalizeExerciseName(name)
  if (target === '') return false
  return exercises.some(
    (e) => e.id !== exceptId && normalizeExerciseName(e.name) === target,
  )
}
