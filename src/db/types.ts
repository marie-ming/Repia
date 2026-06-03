export type Mode = 'trainer' | 'personal'

export interface AppConfigRecord {
  key: string
  value: unknown
}

export type MemberStatus = 'active' | 'ended'

export interface Member {
  id: string
  name: string
  phone: string
  status: MemberStatus
  memo: string
  registeredAt: string // YYYY-MM-DD, user-editable enrollment date
  createdAt: string
  updatedAt: string
}

export type ExerciseCategory =
  | 'upper'
  | 'lower'
  | 'back'
  | 'shoulder'
  | 'chest'
  | 'biceps'
  | 'triceps'
  | 'forearm'
  | 'arm' // legacy — split into biceps/triceps/forearm
  | 'core'
  | 'full'
  | 'cardio'

export type Equipment =
  | 'bodyweight'
  | 'barbell'
  | 'dumbbell'
  | 'kettlebell'
  | 'machine'
  | 'cable'
  | 'band'
  | 'etc'

// 세트 측정 방식
export type ExerciseMetric = 'weight_reps' | 'reps' | 'time' | 'distance_time'

export interface Exercise {
  id: string
  name: string
  categories: ExerciseCategory[] // up to 3
  equipment: Equipment | null
  grip: string // free text (e.g. 오버핸드)
  metric: ExerciseMetric // 세트 입력/표시 방식
  photos: string[] // Base64 data URLs; photos[0] is the representative photo
  description: string
  createdAt: string
  updatedAt: string
}

export interface SetEntry {
  weight: number // kg (weight_reps)
  reps: number // 횟수 (weight_reps, reps)
  seconds?: number // 시간 (time, distance_time)
  distance?: number // km (distance_time)
}

export interface RoutineExercise {
  exerciseId: string
  sets: SetEntry[]
}

export type SessionStatus = 'reserved' | 'completed' | 'cancelled'

export interface Session {
  id: string
  title: string
  memberId: string
  memberNameSnapshot: string
  date: string
  time: string
  status: SessionStatus
  routine: RoutineExercise[]
  memo: string
  createdAt: string
  updatedAt: string
}

export interface RoutineTemplate {
  id: string
  title: string
  categories: ExerciseCategory[] // up to 3
  exercises: RoutineExercise[]
  memo: string
  createdAt: string
  updatedAt: string
}

export type RoutineLogStatus = 'planned' | 'completed' | 'cancelled'

export interface RoutineLog {
  id: string
  templateId: string | null
  title: string
  date: string
  time: string
  status: RoutineLogStatus
  exercises: RoutineExercise[]
  memo: string
  createdAt: string
  updatedAt: string
}
