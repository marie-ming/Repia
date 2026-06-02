import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PagePlaceholder } from './PagePlaceholder.tsx'

describe('PagePlaceholder', () => {
  it('title을 h1으로 표시', () => {
    render(<PagePlaceholder title="루틴" description="아직 없음" />)
    expect(screen.getByRole('heading', { level: 1, name: '루틴' })).toBeInTheDocument()
  })

  it('description 텍스트 표시', () => {
    render(<PagePlaceholder title="x" description="설명 텍스트" />)
    expect(screen.getByText('설명 텍스트')).toBeInTheDocument()
  })
})
