import { useNavigate } from 'react-router-dom'
import { ChevronLeftIcon } from '../components/icons.tsx'
import notesRaw from '../../RELEASE_NOTES.md?raw'

interface NoteGroup {
  label: string // 그룹 머리(예: "🛠 개선"). 단독 라인이면 items 없음
  items: string[]
}
interface Release {
  version: string
  groups: NoteGroup[]
}

function parseNotes(raw: string): Release[] {
  const releases: Release[] = []
  let cur: Release | null = null
  let group: NoteGroup | null = null
  for (const line of raw.split('\n')) {
    const t = line.trim()
    if (!t) continue
    if (t.startsWith('# ')) continue // 문서 제목(# Updates)
    if (t.startsWith('## ')) {
      cur = { version: t.slice(3).trim(), groups: [] }
      releases.push(cur)
      group = null
    } else if (t.startsWith('- ')) {
      if (!cur) continue
      if (!group) {
        group = { label: '', items: [] }
        cur.groups.push(group)
      }
      group.items.push(t.slice(2).trim())
    } else {
      if (!cur) continue
      group = { label: t, items: [] }
      cur.groups.push(group)
    }
  }
  return releases
}

const RELEASES = parseNotes(notesRaw)

export function UpdatesPage() {
  const navigate = useNavigate()
  return (
    <div className="detail">
      <header className="detail__bar">
        <button type="button" className="detail__back" onClick={() => navigate(-1)} aria-label="뒤로">
          <ChevronLeftIcon />
        </button>
        <h1 className="detail__bar-title">업데이트 내역</h1>
        <span className="detail__bar-spacer" aria-hidden="true" />
      </header>
      <div className="detail__body">
        {RELEASES.map((r) => (
          <section key={r.version} className="settings-section">
            <h2 className="settings-section__title">{r.version}</h2>
            {r.groups.map((g, gi) => (
              <div key={gi} className="updates__group">
                {g.label && <p className="updates__group-label">{g.label}</p>}
                {g.items.length > 0 && (
                  <ul className="updates__list">
                    {g.items.map((it, ii) => (
                      <li key={ii}>{it}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </section>
        ))}
      </div>
    </div>
  )
}
