import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SWRConfig } from 'swr'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { APIError } from '../api/client'
import { getAllIncidentReports, updateIncidentReport } from '../api/safety'
import { ModeratorDashboard } from '../pages/ModeratorDashboard'

vi.mock('../api/safety', () => ({
  getAllIncidentReports: vi.fn(),
  updateIncidentReport: vi.fn(),
}))

const pendingReport = {
  id: 17,
  incident_type: 'ACCIDENT',
  description: 'Blocked pedestrian crossing near the station.',
  latitude: '14.000000000',
  longitude: '121.005000000',
  status: 'PENDING',
  reported_at: '2026-01-01T00:00:00Z',
  image: null,
}

function renderModeratorDashboard() {
  return render(
    <SWRConfig
      value={{
        provider: () => new Map(),
        dedupingInterval: 0,
        revalidateOnFocus: false,
      }}
    >
      <ModeratorDashboard />
    </SWRConfig>,
  )
}

describe('moderator incident queue', () => {
  beforeEach(() => {
    getAllIncidentReports.mockResolvedValue({ results: [pendingReport] })
    updateIncidentReport.mockResolvedValue(pendingReport)
  })

  it('shows report context and approves a report', async () => {
    const user = userEvent.setup()

    renderModeratorDashboard()

    expect(await screen.findByRole('heading', { name: 'ACCIDENT' }))
      .toBeInTheDocument()
    expect(screen.getByText(pendingReport.description)).toBeInTheDocument()
    expect(screen.getByText('14.0000, 121.0050')).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'Approve incident report number 17' }),
    )

    await waitFor(() => {
      expect(updateIncidentReport).toHaveBeenCalledWith(
        17,
        { status: 'APPROVED' },
      )
    })
  })

  it('rejects a report as spam', async () => {
    const user = userEvent.setup()

    renderModeratorDashboard()
    await screen.findByRole('heading', { name: 'ACCIDENT' })
    await user.click(
      screen.getByRole('button', { name: 'Reject incident report number 17 as spam' }),
    )

    await waitFor(() => {
      expect(updateIncidentReport).toHaveBeenCalledWith(
        17,
        { status: 'SPAM' },
      )
    })
  })

  it('shows an empty-queue message when there are no reports', async () => {
    getAllIncidentReports.mockResolvedValue({ results: [] })

    renderModeratorDashboard()

    expect(await screen.findByRole('heading', { name: 'No reports need review' }))
      .toBeInTheDocument()
  })

  it('shows a recoverable message when reports cannot be loaded', async () => {
    getAllIncidentReports.mockRejectedValue(new Error('network unavailable'))

    renderModeratorDashboard()

    expect(await screen.findByRole('alert'))
      .toHaveTextContent('Couldn’t load incident reports')
  })

  it('shows the API error when a moderation update fails', async () => {
    const alertMock = vi.fn()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const user = userEvent.setup()
    vi.stubGlobal('alert', alertMock)
    updateIncidentReport.mockRejectedValue(new APIError(
      'Please wait a moment before trying again.',
      429,
      null,
    ))

    renderModeratorDashboard()
    await screen.findByRole('heading', { name: 'ACCIDENT' })
    await user.click(
      screen.getByRole('button', { name: 'Approve incident report number 17' }),
    )

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith(
        'Please wait a moment before trying again.',
      )
    })
    consoleError.mockRestore()
  })
})
