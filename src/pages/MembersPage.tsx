import { useCallback, useEffect, useMemo, useState } from 'react'
import { membersRepo } from '../db/repositories/members.ts'
import { sessionsRepo } from '../db/repositories/sessions.ts'
import type { Member } from '../db/types.ts'
import { MemberFormSheet } from '../components/MemberFormSheet.tsx'
import type { MemberFormData } from '../components/MemberFormSheet.tsx'
import { ConfirmDialog } from '../components/ConfirmDialog.tsx'
import { useToast } from '../components/Toast.tsx'
import { PlusIcon, SearchIcon } from '../components/icons.tsx'
import { formatDotDate } from '../utils/date.ts'

interface MemberRow {
  member: Member
  sessionCount: number
  lastDate: string | null
}

export function MembersPage() {
  const [rows, setRows] = useState<MemberRow[]>([])
  const [loading, setLoading] = useState(true)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<Member | null>(null)
  const [showEnded, setShowEnded] = useState(false)
  const [query, setQuery] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null)
  const showToast = useToast()

  const load = useCallback(async () => {
    const [members, sessions] = await Promise.all([
      membersRepo.findAll({ sortBy: 'name' }),
      sessionsRepo.findAll(),
    ])

    const stats = new Map<string, { count: number; last: string | null }>()
    for (const s of sessions) {
      if (s.status !== 'completed') continue
      const cur = stats.get(s.memberId) ?? { count: 0, last: null }
      cur.count++
      if (!cur.last || s.date > cur.last) cur.last = s.date
      stats.set(s.memberId, cur)
    }

    setRows(
      members.map((member) => ({
        member,
        sessionCount: stats.get(member.id)?.count ?? 0,
        lastDate: stats.get(member.id)?.last ?? null,
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

  function openCreate() {
    setEditing(null)
    setSheetOpen(true)
  }

  function openEdit(member: Member) {
    setEditing(member)
    setSheetOpen(true)
  }

  async function handleSave(data: MemberFormData) {
    if (editing) {
      await membersRepo.update(editing.id, data)
    } else {
      await membersRepo.create(data)
    }
    setSheetOpen(false)
    await load()
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    await membersRepo.delete(deleteTarget.id)
    setDeleteTarget(null)
    setSheetOpen(false)
    showToast('회원이 삭제되었습니다')
    await load()
  }

  return (
    <div className="page">
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
          {visibleRows.map(({ member, sessionCount, lastDate }) => (
            <li key={member.id}>
              <button type="button" className="member-card" onClick={() => openEdit(member)}>
                <span className="member-card__emoji">{member.emoji}</span>
                <span className="member-card__info">
                  <span className="member-card__name-row">
                    <span className="member-card__name">{member.name}</span>
                    {member.status === 'ended' && <span className="badge">수업종료</span>}
                  </span>
                  <span className="member-card__meta">
                    총 {sessionCount}회 · 마지막 {lastDate ? formatDotDate(lastDate) : '수업 없음'}
                  </span>
                  {member.memo && <span className="member-card__memo">{member.memo}</span>}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <button type="button" className="fab" onClick={openCreate} aria-label="회원 추가">
        <PlusIcon />
      </button>

      <MemberFormSheet
        open={sheetOpen}
        member={editing}
        onClose={() => setSheetOpen(false)}
        onSave={handleSave}
        onDelete={(member) => setDeleteTarget(member)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title={`${deleteTarget?.name ?? ''} 회원을 삭제할까요?`}
        message="지난 수업 기록은 그대로 유지됩니다."
        confirmLabel="삭제"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
