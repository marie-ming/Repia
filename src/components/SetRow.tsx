import type { ExerciseMetric, SetEntry } from '../db/types.ts'

interface SetRowProps {
  index: number
  metric: ExerciseMetric
  set: SetEntry
  onChange: (patch: Partial<SetEntry>) => void
  onRemove: () => void
}

function numInput(
  value: number | undefined,
  onChange: (v: number) => void,
  opts: { mode?: 'decimal' | 'numeric'; placeholder?: string } = {},
) {
  return (
    <input
      className="set-row__input"
      type="number"
      inputMode={opts.mode ?? 'numeric'}
      value={value || ''}
      onChange={(e) => onChange(Number(e.target.value))}
      placeholder={opts.placeholder ?? '0'}
    />
  )
}

export function SetRow({ index, metric, set, onChange, onRemove }: SetRowProps) {
  const min = Math.floor((set.seconds ?? 0) / 60)
  const sec = (set.seconds ?? 0) % 60

  return (
    <div className="set-row">
      <span className="set-row__no">{index + 1}</span>

      {metric === 'weight_reps' && (
        <>
          {numInput(set.weight, (v) => onChange({ weight: v }), { mode: 'decimal' })}
          <span className="set-row__unit">kg</span>
          {numInput(set.reps, (v) => onChange({ reps: v }))}
          <span className="set-row__unit">회</span>
        </>
      )}

      {metric === 'reps' && (
        <>
          {numInput(set.reps, (v) => onChange({ reps: v }))}
          <span className="set-row__unit">회</span>
        </>
      )}

      {metric === 'time' && (
        <>
          {numInput(min, (v) => onChange({ seconds: v * 60 + sec }))}
          <span className="set-row__unit">분</span>
          {numInput(sec, (v) => onChange({ seconds: min * 60 + v }))}
          <span className="set-row__unit">초</span>
        </>
      )}

      {metric === 'distance_time' && (
        <>
          {numInput(set.distance, (v) => onChange({ distance: v }), { mode: 'decimal' })}
          <span className="set-row__unit">km</span>
          {numInput(min, (v) => onChange({ seconds: v * 60 + sec }))}
          <span className="set-row__unit">분</span>
          {numInput(sec, (v) => onChange({ seconds: min * 60 + v }))}
          <span className="set-row__unit">초</span>
        </>
      )}

      <button type="button" className="set-row__remove" onClick={onRemove} aria-label="세트 삭제">
        ✕
      </button>
    </div>
  )
}
