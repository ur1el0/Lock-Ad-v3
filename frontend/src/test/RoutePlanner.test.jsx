import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { APIError } from '../api/client'
import { getRoutePreview, getSavedRoutes } from '../api/navigation'
import { getWeather } from '../api/safety'
import { RouteProvider } from '../context/RouteContext'
import { RoutePlannerPage } from '../pages/RoutePlanner'

vi.mock('../api/navigation', () => ({
  getRoutePreview: vi.fn(),
  getSavedRoutes: vi.fn(),
  createSavedRoute: vi.fn(),
}))

vi.mock('../api/safety', () => ({
  getAiAdvisory: vi.fn(),
  getWeather: vi.fn(),
}))

const routePreview = {
  distance_meters: 1250,
  duration_seconds: 900,
  provider: 'openrouteservice',
  geometry: {
    type: 'LineString',
    coordinates: [[121.6238, 13.9381], [121.6179, 13.9442]],
  },
  route_context: {
    coverage_note: 'Mapped data may be incomplete. This is not a safety rating.',
    signals: [{
      signal_type: 'LIGHT',
      source: 'OSM',
      count: 3,
      last_updated_at: '2026-01-01T00:00:00Z',
    }],
    incident_reports: [{
      incident_type: 'ACCIDENT',
      count: 1,
      latest_reported_at: '2026-01-01T00:00:00Z',
    }],
  },
}

function renderRoutePlanner() {
  return render(
    <RouteProvider>
      <RoutePlannerPage />
    </RouteProvider>,
  )
}

describe('route planner flow', () => {
  beforeEach(() => {
    getSavedRoutes.mockResolvedValue([])
    getWeather.mockResolvedValue({ condition: 'Clear', temperature: 24 })
  })

  it('previews a route and explains its mapped context', async () => {
    getRoutePreview.mockResolvedValue(routePreview)
    const user = userEvent.setup()

    renderRoutePlanner()
    await user.click(screen.getByRole('button', { name: 'Preview route' }))

    expect(getRoutePreview).toHaveBeenCalledWith(
      { lat: 13.9381, lng: 121.6238 },
      { lat: 13.9442, lng: 121.6179 },
      'foot-walking',
    )
    expect(await screen.findByText('1.25 km')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Mapped route context' }))
      .toBeInTheDocument()
    expect(screen.getByText(routePreview.route_context.coverage_note))
      .toBeInTheDocument()
    expect(screen.getByText(/light mapped records: 3/i)).toBeInTheDocument()
    expect(screen.getByText(/approved accident reports nearby: 1/i))
      .toBeInTheDocument()
    expect(screen.queryByText(/safety score/i)).not.toBeInTheDocument()
  })

  it('shows provider errors and clears a previous preview before retrying', async () => {
    getRoutePreview
      .mockResolvedValueOnce(routePreview)
      .mockRejectedValueOnce(new APIError(
        'We couldn’t complete this request. Try again in a moment.',
        502,
        null,
      ))
    const user = userEvent.setup()

    renderRoutePlanner()
    const previewButton = screen.getByRole('button', { name: 'Preview route' })
    await user.click(previewButton)
    expect(await screen.findByText('1.25 km')).toBeInTheDocument()

    await user.click(previewButton)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'We couldn’t complete this request. Try again in a moment.',
    )
    expect(screen.queryByText('1.25 km')).not.toBeInTheDocument()
  })

  it('renders saved routes returned as a flat list by the API helper', async () => {
    getSavedRoutes.mockResolvedValue([{
      id: 8,
      name: 'Home to campus',
      origin_lat: 13.9381,
      origin_lng: 121.6238,
      dest_lat: 13.9442,
      dest_lng: 121.6179,
    }])

    renderRoutePlanner()

    expect(await screen.findByRole('button', { name: 'Home to campus' }))
      .toBeInTheDocument()
  })
})
