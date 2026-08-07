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
  // 어시스트 머신처럼 무게가 "보조"라 적을수록 잘한 것인 운동(weight_reps에서만 의미).
  // 켜지면 최고 기록을 최대가 아닌 최소로 잡고 향상 방향(▲▼)도 뒤집는다.
  assisted?: boolean
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
  // 슈퍼세트: 연속된 같은 groupId끼리 한 묶음(b+c를 한 세트로 번갈아 수행).
  // 없으면 단독 운동. 평면 리스트를 그대로 읽는 곳(운동별 기록·삭제 가드 등)은 무시해도 된다.
  groupId?: string
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
