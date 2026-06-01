import { useEffect, useRef, useState } from 'react'
import type { Member, MemberStatus } from '../db/types.ts'
import { BottomSheet } from './BottomSheet.tsx'
import { ConfirmDialog } from './ConfirmDialog.tsx'
import { MEMBER_STATUS_OPTIONS } from '../constants.ts'
import { todayISODate } from '../utils/date.ts'

const DEFAULT_EMOJI = '🙂'

// Keep only the last typed emoji/grapheme so the avatar holds a single character.
function lastGrapheme(value: string): string {
  if (!value) return ''
  const segmenter = new Intl.Segmenter('ko')
  const segments = Array.from(segmenter.segment(value), (s) => s.segment)
  return segments.at(-1) ?? ''
}

export interface MemberFormData {
  emoji: string
  name: string
  phone: string
  status: MemberStatus
  memo: string
  registeredAt: string
}

interface MemberFormSheetProps {
  open: boolean
  member: Member | null // null = create mode
  onClose: () => void
  onSave: (data: MemberFormData) => void
  onDelete: (member: Member) => void
}

function emptyForm(): MemberFormData {
  return {
    emoji: DEFAULT_EMOJI,
    name: '',
    phone: '',
    status: 'active',
    memo: '',
    registeredAt: todayISODate(),
  }
}

export function MemberFormSheet({ open, member, onClose, onSave, onDelete }: MemberFormSheetProps) {
  const [form, setForm] = useState<MemberFormData>(emptyForm)
  const initRef = useRef<MemberFormData>(emptyForm())
  const [confirmClose, setConfirmClose] = useState(false)
  const emojiInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    const initial: MemberFormData = member
      ? {
          emoji: member.emoji,
          name: member.name,
          phone: member.phone,
          status: member.status ?? 'active',
          memo: member.memo,
          registeredAt: member.registeredAt ?? member.createdAt.slice(0, 10),
        }
      : emptyForm()
    setForm(initial)
    initRef.current = initial
    setConfirmClose(false)
  }, [open, member])

  const canSave = form.name.trim().length > 0
  const isDirty = JSON.stringify(form) !== JSON.stringify(initRef.current)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSave) return
    onSave({ ...form, name: form.name.trim() })
  }

  function handleAttemptClose() {
    if (isDirty) setConfirmClose(true)
    else onClose()
  }

  function discardChanges() {
    setConfirmClose(false)
    onClose()
  }

  return (
    <BottomSheet open={open} onClose={handleAttemptClose} title={member ? '회원 수정' : '회원 추가'}>
      <form className="member-form" onSubmit={handleSubmit}>
        <div className="emoji-field">
          <button
            type="button"
            className="emoji-avatar"
            onClick={() => emojiInputRef.current?.focus()}
            aria-label="이모지 선택"
          >
            {form.emoji || DEFAULT_EMOJI}
          </button>
          <input
            ref={emojiInputRef}
            className="emoji-field__input"
            type="text"
            value={form.emoji}
            onChange={(e) => setForm((f) => ({ ...f, emoji: lastGrapheme(e.target.value) }))}
            aria-label="이모지"
          />
          <span className="emoji-field__hint">탭해서 이모지를 선택하세요</span>
        </div>

        <label className="field">
          <span className="field__label">이름 *</span>
          <input
            className="field__input"
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="회원 이름"
            autoFocus
          />
        </label>

        <label className="field">
          <span className="field__label">전화번호</span>
          <input
            className="field__input"
            type="tel"
            inputMode="tel"
            value={form.phone}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            placeholder="010-0000-0000"
          />
        </label>

        <label className="field">
          <span className="field__label">최초등록일</span>
          <input
            className="field__input"
            type="date"
            value={form.registeredAt}
            onChange={(e) => setForm((f) => ({ ...f, registeredAt: e.target.value }))}
          />
        </label>

        <div className="field">
          <span className="field__label">상태</span>
          <div className="segmented">
            {MEMBER_STATUS_OPTIONS.map((opt) => (
              <button
                type="button"
                key={opt.value}
                className={
                  form.status === opt.value ? 'segmented__item segmented__item--active' : 'segmented__item'
                }
                onClick={() => setForm((f) => ({ ...f, status: opt.value }))}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <label className="field">
          <span className="field__label">메모</span>
          <textarea
            className="field__input field__textarea"
            value={form.memo}
            onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))}
            placeholder="특이사항, 목표 등"
            rows={3}
          />
        </label>

        <div className="member-form__actions">
          <button type="submit" className="btn btn--primary" disabled={!canSave}>
            저장
          </button>
          {member && (
            <button
              type="button"
              className="btn btn--danger-ghost"
              onClick={() => onDelete(member)}
            >
              삭제
            </button>
          )}
        </div>
      </form>

      <ConfirmDialog
        open={confirmClose}
        title="저장하지 않은 변경사항이 있습니다"
        message="닫으면 변경사항이 사라집니다."
        confirmLabel="닫기"
        cancelLabel="계속 작성"
        danger
        onConfirm={discardChanges}
        onCancel={() => setConfirmClose(false)}
      />
    </BottomSheet>
  )
}
