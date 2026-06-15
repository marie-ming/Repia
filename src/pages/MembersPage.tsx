import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { membersRepo } from '../db/repositories/members.ts'
import { sessionsRepo } from '../db/repositories/sessions.ts'
import type { Member } from '../db/types.ts'
import { MemberFormSheet } from '../components/MemberFormSheet.tsx'
import type { MemberFormData } from '../components/MemberFormSheet.tsx'
import { useToast } from '../components/Toast.tsx'
import { PlusIcon, SearchIcon } from '../components/icons.tsx'

interface MemberRow {
  member: Member
  reserved: number
  completed: number
}

export function MembersPage() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<MemberRow[]>([])
  const [loading, setLoading] = useState(true)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [showEnded, setShowEnded] = useState(false)
  const [query, setQuery] = useState('')
  const showToast = useToast()

  const load = useCallback(async () => {
    const [members, sessions] = await Promise.all([
      membersRepo.findAll({ sortBy: 'name' }),
      sessionsRepo.findAll(),
    ])

    const stats = new Map<string, { reserved: number; completed: number }>()
    for (const s of sessions) {
      if (s.status !== 'reserved' && s.status !== 'completed') continue
      const cur = stats.get(s.memberId) ?? { reserved: 0, completed: 0 }
      if (s.status === 'reserved') cur.reserved++
      else cur.completed++
      stats.set(s.memberId, cur)
    }

    setRows(
      members.map((member) => ({
        member,
        reserved: stats.get(member.id)?.reserved ?? 0,
        completed: stats.get(member.id)?.completed ?? 0,
      })),
    )
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const hasEnded = useMemo(() => rows.some((r) => r.member.status === 'ended'), [rows])

  const visibleRows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return rows.filter((r) => {
      if (!showEnded && r.member.status === 'ended') return false
      if (q && !r.member.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [rows, showEnded, query])

  async function handleCreate(data: MemberFormData) {
    try {
      await membersRepo.create(data)
      setSheetOpen(false)
      showToast('회원이 추가되었습니다')
      await load()
    } catch (err) {
      showToast(err instanceof Error ? `저장 실패: ${err.message}` : '저장에 실패했습니다')
    }
  }

  function metaParts(r: MemberRow): string[] {
    const parts: string[] = []
    if (r.reserved > 0) parts.push(`예정 ${r.reserved}`)
    if (r.completed > 0) parts.push(`완료 ${r.completed}`)
    return parts
  }

  return (
    <div className="page">
      <div className="page__sticky">
        <header className="page__header">
          <h1 className="page__title">회원</h1>
        </header>

        {!loading && rows.length > 0 && (
          <div className="member-toolbar">
            <div className="search">
              <SearchIcon className="search__icon" />
              <input
                className="search__input"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="이름 검색"
              />
            </div>
            {hasEnded && (
              <button
                type="button"
                className={showEnded ? 'chip chip--active' : 'chip'}
                onClick={() => setShowEnded((v) => !v)}
              >
                수업종료
              </button>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <p className="page__placeholder">불러오는 중...</p>
      ) : visibleRows.length === 0 ? (
        <div className="empty">
          <p className="empty__title">
            {rows.length === 0
              ? '등록된 회원이 없습니다'
              : query.trim()
                ? '검색 결과가 없습니다'
                : '표시할 회원이 없습니다'}
          </p>
          <p className="empty__desc">
            {rows.length === 0
              ? '아래 + 버튼으로 첫 회원을 추가해보세요.'
              : query.trim()
                ? `'${query.trim()}'와 일치하는 회원이 없습니다.`
                : '진행중인 회원이 없습니다.'}
          </p>
        </div>
      ) : (
        <ul className="member-list">
          {visibleRows.map((row) => {
            const { member } = row
            const parts = metaParts(row)
            return (
              <li key={member.id}>
                <button
                  type="button"
                  className="member-card"
                  onClick={() => navigate(`/members/${member.id}`)}
                >
                  <span className="member-card__info">
                    <span className="member-card__name-row">
                      <span className="member-card__name">{member.name}</span>
                      {member.status === 'ended' && <span className="badge">수업종료</span>}
                      {parts.length > 0 && (
                        <span className="member-card__meta">{parts.join(' · ')}</span>
                      )}
                    </span>
                    {member.memo && <span className="member-card__memo">{member.memo}</span>}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <button type="button" className="fab" onClick={() => setSheetOpen(true)} aria-label="회원 추가">
        <PlusIcon />
      </button>

      <MemberFormSheet
        open={sheetOpen}
        member={null}
        onClose={() => setSheetOpen(false)}
        onSave={handleCreate}
        onDelete={() => {}}
      />
    </div>
  )
}
