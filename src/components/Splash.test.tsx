import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Splash } from './Splash.tsx'

describe('Splash', () => {
  it('Repia 로고와 부제 표시', () => {
    render(<Splash />)
    expect(screen.getByRole('heading', { name: 'Repia' })).toBeInTheDocument()
    expect(screen.getByText('매일의 운동을 기록하다')).toBeInTheDocument()
  })
})
