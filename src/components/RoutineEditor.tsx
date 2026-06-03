import { useState } from 'react'
import type { RoutineExercise, SetEntry, ExerciseMetric, Exercise } from '../db/types.ts'
import { ExercisePicker } from './ExercisePicker.tsx'
import { SetRow } from './SetRow.tsx'

interface RoutineEditorProps {
  value: RoutineExercise[]
  onChange: (next: RoutineExercise[]) => void
  exercises: Exercise[] // 운동 카탈로그 (이름·측정 방식·picker)
  // 운동 추가 시 그 운동의 직전 세트 구성으로 프리필 (없으면 1세트 0/0)
  lastSetsByExercise?: Map<string, SetEntry[]>
}

export function RoutineEditor({ value, onChange, exercises, lastSetsByExercise }: RoutineEditorProps) {
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
    onChange(value.filter((_, i) => i !== ri))
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

  return (
    <div className="routine-editor">
      {value.map((r, ri) => (
        <div className="routine-ex" key={ri}>
          <div className="routine-ex__head">
            <span className="routine-ex__name">{exerciseName(r.exerciseId)}</span>
            <button
              type="button"
              className="routine-ex__remove"
              onClick={() => removeExercise(ri)}
              aria-label="운동 제거"
            >
              ✕
            </button>
          </div>
          {r.sets.map((set, si) => (
            <SetRow
              key={si}
              index={si}
              metric={metricFor(r.exerciseId)}
              set={set}
              onChange={(patch) => updateSet(ri, si, patch)}
              onRemove={() => removeSet(ri, si)}
            />
          ))}
          <button type="button" className="routine-ex__add-set" onClick={() => addSet(ri)}>
            + 세트 추가
          </button>
        </div>
      ))}
      <button
        type="button"
        className="add-exercise-btn"
        onClick={() => setPickerOpen(true)}
        disabled={exercises.length === 0}
      >
        + 운동 추가
      </button>

      <ExercisePicker
        open={pickerOpen}
        exercises={exercises}
        excludeIds={[]}
        onClose={() => setPickerOpen(false)}
        onConfirm={handlePickerConfirm}
      />
    </div>
  )
}
