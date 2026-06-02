import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { membersRepo } from '../db/repositories/members.ts'
import { sessionsRepo } from '../db/repositories/sessions.ts'
import type { Member, Session } from '../db/types.ts'
import { MemberFormSheet } from '../components/MemberFormSheet.tsx'
import type { MemberFormData } from '../components/MemberFormSheet.tsx'
import { ConfirmDialog } from '../components/ConfirmDialog.tsx'
import { useToast } from '../components/Toast.tsx'
import { ChevronLeftIcon } from '../components/icons.tsx'
import { SESSION_STATUS_LABELS } from '../constants.ts'
import { formatDotDate, formatShortDateWithWeekday } from '../utils/date.ts'

export function MemberDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const showToast = useToast()
  const [member, setMember] = useState<Member | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [confirmDel, setConfirmDel] = useState(false)

  const load = useCallback(async () => {
    if (!id) return
    const m = await membersRepo.findById(id)
    setMember(m ?? null)
    if (m) {
      const ss = await sessionsRepo.findByMember(id)
      setSessions(ss)
    }
    setLoading(false)
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  const stats = useMemo(() => {
    const reserved = sessions.filter((s) => s.status === 'reserved').length
    const completed = sessions.filter((s) => s.status === 'completed').length
    // recent: newest first by date+time
    const sorted = [...sessions].sort((a, b) =>
      (b.date + b.time).localeCompare(a.date + a.time),
    )
    return { reserved, completed, recent: sorted.slice(0, 10) }
  }, [sessions])

  async function handleSave(data: MemberFormData) {
    if (!member) return
    await membersRepo.update(member.id, data)
    setEditOpen(false)
    showToast('회원 정보가 수정되었습니다')
    await load()
  }

  async function confirmDelete() {
    if (!member) return
    await membersRepo.delete(member.id)
    setConfirmDel(false)
    setEditOpen(false)
    showToast('회원이 삭제되었습니다')
    navigate('/members')
  }

  if (loading) {
    return (
      <div className="detail">
        <p className="page__placeholder">불러오는 중...</p>
      </div>
    )
  }

  if (!member) {
    return (
      <div className="detail">
        <header className="detail__bar">
          <button type="button" className="detail__back" onClick={() => navigate(-1)} aria-label="뒤로">
            <ChevronLeftIcon />
          </button>
          <span className="detail__bar-spacer" />
        </header>
        <div className="empty">
          <p className="empty__title">회원을 찾을 수 없습니다</p>
        </div>
      </div>
    )
  }

  const registeredAt = member.registeredAt ?? member.createdAt.slice(0, 10)

  return (
    <div className="detail">
      <header className="detail__bar">
        <button type="button" className="detail__back" onClick={() => navigate(-1)} aria-label="뒤로">
          <ChevronLeftIcon />
        </button>
        <button type="button" className="detail__edit" onClick={() => setEditOpen(true)}>
          수정
        </button>
      </header>

      <div className="detail__body">
        <div className="member-detail__head">
          <h1 className="member-detail__name">{member.name}</h1>
          {member.status === 'ended' && <span className="badge">수업종료</span>}
        </div>

        <dl className="info-list">
          {member.phone && (
            <div className="info-list__row">
              <dt className="info-list__label">연락처</dt>
              <dd className="info-list__value">{member.phone}</dd>
            </div>
          )}
          <div className="info-list__row">
            <dt className="info-list__label">등록일</dt>
            <dd className="info-list__value">{formatDotDate(registeredAt)}</dd>
          </div>
          {member.memo && (
            <div className="info-list__row">
              <dt className="info-list__label">메모</dt>
              <dd className="info-list__value">{member.memo}</dd>
            </div>
          )}
        </dl>

        <div className="member-detail__sessions-head">
          <h2 className="detail__section">수업</h2>
          {stats.reserved === 0 && stats.completed === 0 ? (
            <span className="info-list__empty">수업 기록 없음</span>
          ) : (
            <span className="member-stats">
              {[
                stats.reserved > 0 ? `예정 ${stats.reserved}` : null,
                stats.completed > 0 ? `완료 ${stats.completed}` : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
          )}
        </div>

        {stats.recent.length > 0 && (
          <ul className="history-list">
            {stats.recent.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  className={
                    s.status === 'cancelled'
                      ? 'history-item history-item--cancelled'
                      : 'history-item'
                  }
                  onClick={() => navigate(`/sessions/${s.id}`)}
                >
                  <span className="history-item__date">{formatShortDateWithWeekday(s.date)}</span>
                  {s.time && <span className="history-item__time">{s.time}</span>}
                  <span className={`session-badge session-badge--${s.status}`}>
                    {SESSION_STATUS_LABELS[s.status]}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <MemberFormSheet
        open={editOpen}
        member={member}
        onClose={() => setEditOpen(false)}
        onSave={handleSave}
        onDelete={() => setConfirmDel(true)}
      />

      <ConfirmDialog
        open={confirmDel}
        title={`${member.name} 회원을 삭제할까요?`}
        message="지난 수업 기록은 그대로 유지됩니다."
        confirmLabel="삭제"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDel(false)}
      />
    </div>
  )
}
