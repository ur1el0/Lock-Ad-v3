import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAuth } from '../hooks/useAuth'
import { BottomNav } from '../components/BottomNav'

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

function renderBottomNav() {
  return render(
    <MemoryRouter>
      <BottomNav />
    </MemoryRouter>,
  )
}

describe('bottom navigation', () => {
  beforeEach(() => {
    useAuth.mockReset()
  })

  it('shows the moderator link for staff users', () => {
    useAuth.mockReturnValue({ user: { is_staff: true } })

    renderBottomNav()

    expect(screen.getByRole('link', { name: 'Moderator' })).toBeInTheDocument()
  })

  it('does not show the moderator link for regular users', () => {
    useAuth.mockReturnValue({ user: { is_staff: false } })

    renderBottomNav()

    expect(screen.queryByRole('link', { name: 'Moderator' })).not.toBeInTheDocument()
  })
})
