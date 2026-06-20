import type { ReactNode } from 'react'
import type { RoutineExercise, Exercise, ExerciseMetric } from '../db/types.ts'
import { ChevronRightIcon } from './icons.tsx'
import { renderSetValue } from '../utils/setValue.tsx'

interface RoutineReadonlyProps {
  items: RoutineExercise[]
  exercises: Exercise[] // 이름/측정방식 조회용 카탈로그
  onExerciseClick: (exerciseId: string) => void
  // 운동명 옆 추가 표시(예: 기록 상세의 최고/이전 대비). 없으면 미표시
  renderMeta?: (item: RoutineExercise, metric: ExerciseMetric) => ReactNode
}

// 기록/루틴/수업 상세에서 공용으로 쓰는 읽기 전용 운동·세트 목록
export function RoutineReadonly({
  items,
  exercises,
  onExerciseClick,
  renderMeta,
}: RoutineReadonlyProps) {
  const byId = new Map(exercises.map((e) => [e.id, e]))
  return (
    <ul className="routine-readonly">
      {items.map((r, ri) => {
        const ex = byId.get(r.exerciseId)
        const metric: ExerciseMetric = ex?.metric ?? 'weight_reps'
        return (
          <li key={ri} className="routine-readonly__ex">
            <div className="routine-readonly__head">
              <div className="routine-readonly__headmain">
                <h3 className="routine-readonly__name">{ex?.name ?? '(삭제된 운동)'}</h3>
                {renderMeta?.(r, metric)}
              </div>
              <button
                type="button"
                className="routine-readonly__link"
                onClick={() => onExerciseClick(r.exerciseId)}
                aria-label="운동 상세 보기"
              >
                <ChevronRightIcon className="routine-readonly__chevron" />
              </button>
            </div>
            <ul className="routine-readonly__sets">
              {r.sets.map((s, si) => (
                <li key={si} className="routine-readonly__set">
                  <span className="routine-readonly__set-no">{si + 1}</span>
                  <span className="routine-readonly__set-val">{renderSetValue(metric, s)}</span>
                </li>
              ))}
            </ul>
          </li>
        )
      })}
    </ul>
  )
}
