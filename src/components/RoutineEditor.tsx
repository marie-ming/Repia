import { Fragment, useState } from 'react'
import type { RoutineExercise, SetEntry, ExerciseMetric, Exercise } from '../db/types.ts'
// (ExerciseMetric은 picker 콜백 시그니처에 사용)
import { ExercisePicker } from './ExercisePicker.tsx'
import { SetRow } from './SetRow.tsx'
import {
  toBlocks,
  isSuperset,
  normalizeGroups,
  linkWithAbove,
  unlinkFromGroup,
  moveBlock,
  moveWithinGroup,
  roundCount,
  addRound,
  removeRound,
} from '../utils/routineGroups.ts'

interface RoutineEditorProps {
  value: RoutineExercise[]
  onChange: (next: RoutineExercise[]) => void
  exercises: Exercise[] // 운동 카탈로그 (이름·측정 방식·picker)
  // 운동 추가 시 그 운동의 직전 세트 구성으로 프리필 (없으면 1세트 0/0)
  lastSetsByExercise?: Map<string, SetEntry[]>
  // picker에서 새 운동 즉시 생성
  onCreateExercise?: (name: string, metric: ExerciseMetric) => Promise<Exercise>
}

export function RoutineEditor({
  value,
  onChange,
  exercises,
  lastSetsByExercise,
  onCreateExercise,
}: RoutineEditorProps) {
  const [pickerOpen, setPickerOpen] = useState(false)

  function exerciseName(exId: string): string {
    return exercises.find((e) => e.id === exId)?.name ?? '(삭제된 운동)'
  }
  function metricFor(exId: string): ExerciseMetric {
    return exercises.find((e) => e.id === exId)?.metric ?? 'weight_reps'
  }

  function handlePickerConfirm(ids: string[]) {
    const toAdd = ids.map((x) => {
      const prev = lastSetsByExercise?.get(x)
      return {
        exerciseId: x,
        sets: prev ? prev.map((s) => ({ ...s })) : [{ weight: 0, reps: 0 }],
      }
    })
    onChange([...value, ...toAdd])
    setPickerOpen(false)
  }

  function removeExercise(ri: number) {
    onChange(normalizeGroups(value.filter((_, i) => i !== ri)))
  }
  function addSet(ri: number) {
    onChange(
      value.map((r, i) => {
        if (i !== ri) return r
        const last = r.sets[r.sets.length - 1]
        const next = last ? { ...last } : { weight: 0, reps: 0 }
        return { ...r, sets: [...r.sets, next] }
      }),
    )
  }
  function removeSet(ri: number, si: number) {
    onChange(value.map((r, i) => (i === ri ? { ...r, sets: r.sets.filter((_, j) => j !== si) } : r)))
  }
  function updateSet(ri: number, si: number, patch: Partial<SetEntry>) {
    onChange(
      value.map((r, i) =>
        i === ri ? { ...r, sets: r.sets.map((s, j) => (j === si ? { ...s, ...patch } : s)) } : r,
      ),
    )
  }

  const blocks = toBlocks(value)

  return (
    <div className="routine-editor">
      {blocks.map((block, bi) => {
        const superset = isSuperset(block)

        // 묶음 안에서는 ↑↓가 묶음 내 순서를, 묶음 밖에서는 블록 순서를 바꾼다
        const rows = block.indices.map((ri, pos) => (
          <div className={superset ? 'routine-ex routine-ex--in-group' : 'routine-ex'} key={ri}>
            <div className="routine-ex__head">
              <span className="routine-ex__name">{exerciseName(value[ri].exerciseId)}</span>
              <div className="routine-ex__actions">
                <button
                  type="button"
                  className="routine-ex__move"
                  onClick={() =>
                    onChange(superset ? moveWithinGroup(value, ri, -1) : moveBlock(value, bi, -1))
                  }
                  disabled={superset ? pos === 0 : bi === 0}
                  aria-label="위로 이동"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="routine-ex__move"
                  onClick={() =>
                    onChange(superset ? moveWithinGroup(value, ri, 1) : moveBlock(value, bi, 1))
                  }
                  disabled={superset ? pos === block.indices.length - 1 : bi === blocks.length - 1}
                  aria-label="아래로 이동"
                >
                  ↓
                </button>
                {superset ? (
                  <button
                    type="button"
                    className="routine-ex__link"
                    onClick={() => onChange(unlinkFromGroup(value, ri))}
                    aria-label="묶음 해제"
                  >
                    해제
                  </button>
                ) : (
                  <button
                    type="button"
                    className="routine-ex__link"
                    onClick={() => onChange(linkWithAbove(value, ri))}
                    disabled={ri === 0}
                    aria-label="위 운동과 묶기"
                  >
                    묶기
                  </button>
                )}
                <button
                  type="button"
                  className="routine-ex__remove"
                  onClick={() => removeExercise(ri)}
                  aria-label="운동 제거"
                >
                  ✕
                </button>
              </div>
            </div>
            {value[ri].sets.map((set, si) => (
              <SetRow
                key={si}
                index={si}
                metric={metricFor(value[ri].exerciseId)}
                set={set}
                onChange={(patch) => updateSet(ri, si, patch)}
                // 묶음에서는 세트=라운드라 멤버 전원에서 같은 순번을 함께 뺀다
                onRemove={() =>
                  superset ? onChange(removeRound(value, block.indices, si)) : removeSet(ri, si)
                }
              />
            ))}
            {!superset && (
              <button type="button" className="routine-ex__add-set" onClick={() => addSet(ri)}>
                + 세트 추가
              </button>
            )}
          </div>
        ))

        if (!superset) return <Fragment key={`block-${bi}`}>{rows}</Fragment>

        return (
          <div className="superset" key={block.groupId}>
            <div className="superset__head">
              <span className="superset__label">슈퍼세트</span>
              <span className="superset__rounds">{roundCount(value, block.indices)}라운드</span>
              <div className="routine-ex__actions">
                <button
                  type="button"
                  className="routine-ex__move"
                  onClick={() => onChange(moveBlock(value, bi, -1))}
                  disabled={bi === 0}
                  aria-label="묶음 위로 이동"
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="routine-ex__move"
                  onClick={() => onChange(moveBlock(value, bi, 1))}
                  disabled={bi === blocks.length - 1}
                  aria-label="묶음 아래로 이동"
                >
                  ↓
                </button>
              </div>
            </div>
            {rows}
            <button
              type="button"
              className="superset__add-round"
              onClick={() => onChange(addRound(value, block.indices))}
            >
              + 라운드 추가
            </button>
          </div>
        )
      })}
      <button
        type="button"
        className="add-exercise-btn"
        onClick={() => setPickerOpen(true)}
        disabled={exercises.length === 0 && !onCreateExercise}
      >
        + 운동 추가
      </button>

      <ExercisePicker
        open={pickerOpen}
        exercises={exercises}
        excludeIds={[]}
        onClose={() => setPickerOpen(false)}
        onConfirm={handlePickerConfirm}
        onCreateExercise={onCreateExercise}
      />
    </div>
  )
}
