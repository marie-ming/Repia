// 데모 데이터 시드. 검증용으로만 사용. 기존 데이터는 호출 전에 resetAllData()로 비울 것.
import { membersRepo } from './repositories/members.ts'
import { exercisesRepo } from './repositories/exercises.ts'
import { sessionsRepo } from './repositories/sessions.ts'
import { routineLogsRepo } from './repositories/routineLogs.ts'
import { routineTemplatesRepo } from './repositories/routineTemplates.ts'
import type { Exercise } from './types.ts'
import { addDays, todayISODate, parseISODate, toISODate } from '../utils/date.ts'

const EXERCISES = [
  { name: '데드리프트', categories: ['back', 'lower'] as const, equipment: 'barbell' as const, grip: '오버핸드', metric: 'weight_reps' as const },
  { name: '벤치프레스', categories: ['chest'] as const, equipment: 'barbell' as const, grip: '오버핸드', metric: 'weight_reps' as const },
  { name: '바벨 스쿼트', categories: ['lower'] as const, equipment: 'barbell' as const, grip: '', metric: 'weight_reps' as const },
  { name: '오버헤드 프레스', categories: ['shoulder'] as const, equipment: 'barbell' as const, grip: '오버핸드', metric: 'weight_reps' as const },
  { name: '케이블 풀다운', categories: ['back'] as const, equipment: 'cable' as const, grip: '오버핸드', metric: 'weight_reps' as const },
  { name: '풀업', categories: ['back', 'biceps'] as const, equipment: 'bodyweight' as const, grip: '오버핸드', metric: 'reps' as const },
  { name: '덤벨 컬', categories: ['biceps'] as const, equipment: 'dumbbell' as const, grip: '언더핸드', metric: 'weight_reps' as const },
  { name: '트라이셉 푸시다운', categories: ['triceps'] as const, equipment: 'cable' as const, grip: '', metric: 'weight_reps' as const },
  { name: '레그 익스텐션', categories: ['lower'] as const, equipment: 'machine' as const, grip: '', metric: 'weight_reps' as const },
  { name: '플랭크', categories: ['core'] as const, equipment: 'bodyweight' as const, grip: '', metric: 'time' as const },
  { name: '런닝', categories: ['cardio'] as const, equipment: null, grip: '', metric: 'distance_time' as const },
  { name: '어시스트 풀업', categories: ['back', 'biceps'] as const, equipment: 'machine' as const, grip: '오버핸드', metric: 'weight_reps' as const, assisted: true },
]

// 운동 측정 방식별 무작위 세트 생성
function randomSets(metric: string) {
  const w = () => [20, 40, 60, 80, 100][Math.floor(Math.random() * 5)]
  const reps = () => 5 + Math.floor(Math.random() * 8)
  if (metric === 'reps') {
    return Array.from({ length: 3 }, () => ({ weight: 0, reps: 6 + Math.floor(Math.random() * 8) }))
  }
  if (metric === 'time') {
    return Array.from({ length: 3 }, () => ({
      weight: 0,
      reps: 0,
      seconds: [30, 45, 60, 90][Math.floor(Math.random() * 4)],
    }))
  }
  if (metric === 'distance_time') {
    return [
      {
        weight: 0,
        reps: 0,
        distance: [3, 5, 7][Math.floor(Math.random() * 3)],
        seconds: [1200, 1800, 2400][Math.floor(Math.random() * 3)],
      },
    ]
  }
  return Array.from({ length: 3 + Math.floor(Math.random() * 2) }, () => ({ weight: w(), reps: reps() }))
}

const MEMBERS = [
  { name: '김철수', phone: '010-1111-2222', memo: '주 3회, 하체 위주' },
  { name: '이영희', phone: '010-3333-4444', memo: '재활 중 — 무리하지 말 것' },
  { name: '박민수', phone: '010-5555-6666', memo: '대회 준비 중' },
  { name: '정수진', phone: '010-7777-8888', memo: '' },
  { name: '최우진', phone: '010-9999-0000', status: 'ended' as const, memo: '계약 종료' },
]

export async function seedDemoData(): Promise<void> {
  // exercises
  const exs: Exercise[] = []
  for (const e of EXERCISES) {
    const created = await exercisesRepo.create({
      name: e.name,
      categories: [...e.categories],
      equipment: e.equipment,
      grip: e.grip,
      metric: e.metric,
      assisted: 'assisted' in e ? e.assisted : false,
    })
    exs.push(created)
  }

  // members
  const mems = []
  for (const m of MEMBERS) {
    const created = await membersRepo.create(m)
    mems.push(created)
  }

  const today = parseISODate(todayISODate())
  const activeMems = mems.filter((m) => m.status !== 'ended')

  // sessions: 지난 14일 ~ 다음 14일 분포
  for (let d = -14; d <= 14; d++) {
    if (Math.random() < 0.4) continue // 일부 날은 비움
    const date = toISODate(addDays(today, d))
    const count = 1 + Math.floor(Math.random() * 3)
    for (let i = 0; i < count; i++) {
      const member = activeMems[Math.floor(Math.random() * activeMems.length)]
      const hour = 9 + Math.floor(Math.random() * 11) // 09~19
      const time = `${String(hour).padStart(2, '0')}:00`
      const status =
        d < 0 ? (Math.random() < 0.85 ? 'completed' : 'cancelled') : 'reserved'
      const exCount = 2 + Math.floor(Math.random() * 3)
      const picked = [...exs].sort(() => Math.random() - 0.5).slice(0, exCount)
      await sessionsRepo.create({
        memberId: member.id,
        memberNameSnapshot: member.name,
        date,
        time,
        status,
        routine: picked.map((ex) => ({
          exerciseId: ex.id,
          sets: randomSets(ex.metric),
        })),
        memo: '',
      })
    }
  }

  // routine logs (개인 운동 기록): 지난 21일
  const titles = ['하체 데이', '상체 데이', '풀바디', '유산소', '컨디션 체크']
  for (let d = -21; d <= 0; d++) {
    if (Math.random() < 0.5) continue
    const date = toISODate(addDays(today, d))
    const title = titles[Math.floor(Math.random() * titles.length)]
    const exCount = 2 + Math.floor(Math.random() * 3)
    const picked = [...exs].sort(() => Math.random() - 0.5).slice(0, exCount)
    await routineLogsRepo.create({
      title,
      date,
      time: '',
      status: d <= 0 ? 'completed' : 'planned',
      exercises: picked.map((ex) => ({
        exerciseId: ex.id,
        sets: randomSets(ex.metric),
      })),
      memo: '',
    })
  }

  // routine templates (개인 루틴)
  const byName = (n: string) => exs.find((e) => e.name === n)!

  // 단골 운동: 더보기/추세 확인용 다회 완료 기록 (점진적 중량 증가)
  const fav = byName('벤치프레스')
  for (let k = 12; k >= 1; k--) {
    const base = 50 + (12 - k) * 2.5
    await routineLogsRepo.create({
      title: '상체 데이',
      date: toISODate(addDays(today, -k * 5)),
      time: '',
      status: 'completed',
      exercises: [
        {
          exerciseId: fav.id,
          sets: [
            { weight: base, reps: 10 },
            { weight: base + 5, reps: 8 },
            { weight: base + 10, reps: 6 },
          ],
        },
      ],
      memo: '',
    })
  }

  // 보조 무게: 어시스트가 40 → 25kg로 줄어드는 흐름(적을수록 향상이라 ▲로 표시된다)
  const assistedEx = byName('어시스트 풀업')
  for (let k = 6; k >= 1; k--) {
    const assist = 25 + (k - 1) * 3
    await routineLogsRepo.create({
      title: '등 데이',
      date: toISODate(addDays(today, -k * 4)),
      time: '',
      status: 'completed',
      exercises: [
        {
          exerciseId: assistedEx.id,
          sets: [
            { weight: assist, reps: 8 },
            { weight: assist, reps: 7 },
            { weight: assist + 5, reps: 8 },
          ],
        },
      ],
      memo: '',
    })
  }

  // 슈퍼세트: 이두/삼두를 한 라운드로 묶은 기록
  const armGroup = 'grp_demo_arm'
  await routineLogsRepo.create({
    title: '팔 슈퍼세트',
    date: toISODate(addDays(today, -3)),
    time: '',
    status: 'completed',
    exercises: [
      { exerciseId: byName('벤치프레스').id, sets: [{ weight: 60, reps: 10 }] },
      {
        exerciseId: byName('덤벨 컬').id,
        sets: [
          { weight: 12, reps: 12 },
          { weight: 14, reps: 10 },
          { weight: 14, reps: 8 },
        ],
        groupId: armGroup,
      },
      {
        exerciseId: byName('트라이셉 푸시다운').id,
        sets: [
          { weight: 20, reps: 15 },
          { weight: 25, reps: 12 },
          { weight: 25, reps: 10 },
        ],
        groupId: armGroup,
      },
    ],
    memo: '',
  })

  const templates = [
    {
      title: '하체 루틴',
      categories: ['lower'] as const,
      names: ['바벨 스쿼트', '데드리프트', '레그 익스텐션'],
    },
    {
      title: '상체 루틴',
      categories: ['chest', 'back', 'shoulder'] as const,
      names: ['벤치프레스', '케이블 풀다운', '오버헤드 프레스'],
    },
    {
      title: '유산소 + 코어',
      categories: ['cardio', 'core'] as const,
      names: ['런닝', '플랭크'],
    },
  ]
  for (const t of templates) {
    await routineTemplatesRepo.create({
      title: t.title,
      categories: [...t.categories],
      exercises: t.names.map((n) => {
        const ex = byName(n)
        return { exerciseId: ex.id, sets: randomSets(ex.metric) }
      }),
      memo: '',
    })
  }

  // 슈퍼세트가 들어간 루틴 (편집 화면에서 묶음 UI를 바로 볼 수 있게)
  const supersetGroup = 'grp_demo_tpl'
  await routineTemplatesRepo.create({
    title: '팔 슈퍼세트 루틴',
    categories: ['biceps', 'triceps'],
    exercises: [
      { exerciseId: byName('풀업').id, sets: randomSets('reps') },
      { exerciseId: byName('덤벨 컬').id, sets: randomSets('weight_reps'), groupId: supersetGroup },
      {
        exerciseId: byName('트라이셉 푸시다운').id,
        sets: randomSets('weight_reps'),
        groupId: supersetGroup,
      },
    ],
    memo: '이두·삼두를 번갈아 한 라운드로',
  })
}
