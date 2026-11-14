import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  addEmergencyContact,
  deleteEmergencyContact,
  getEmergencyContacts,
} from '../api/emergency'
import { useAuth } from '../hooks/useAuth'
import { EmergencyContactsPage } from '../pages/EmergencyContactsPage'

vi.mock('../api/emergency', () => ({
  addEmergencyContact: vi.fn(),
  deleteEmergencyContact: vi.fn(),
  getEmergencyContacts: vi.fn(),
}))

vi.mock('../hooks/useAuth', () => ({
  useAuth: vi.fn(),
}))

describe('emergency contacts page', () => {
  beforeEach(() => {
    getEmergencyContacts.mockResolvedValue([{
      id: 1,
      name: 'Mina Reyes',
      phone_number: '+639171234567',
      relationship: 'Sibling',
    }])
    useAuth.mockReturnValue({ user: { is_staff: false } })
  })

  it('renders contacts returned as a flat list by the API helper', async () => {
    render(<EmergencyContactsPage />)

    expect(await screen.findByText('Mina Reyes')).toBeInTheDocument()
    expect(screen.getByText('+639171234567 • Sibling')).toBeInTheDocument()
    expect(addEmergencyContact).not.toHaveBeenCalled()
    expect(deleteEmergencyContact).not.toHaveBeenCalled()
  })
})
