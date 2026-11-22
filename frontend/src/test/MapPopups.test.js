import { describe, expect, it } from 'vitest'

import {
  createIncidentPopup,
  createSafetySignalPopup,
  MAP_DATA_COVERAGE_NOTICE,
} from '../components/mapPopups'

describe('map safety context', () => {
  it('shows the source and Lock-Ad refresh time without interpreting them as verification', () => {
    const popup = createSafetySignalPopup({
      name: 'Street light',
      signal_type: 'LIGHT',
      source: 'OSM',
      updated_at: '2026-01-01T00:00:00Z',
    })
    const lines = Array.from(popup.children, (child) => child.textContent)

    expect(lines[1]).toBe('Type: LIGHT')
    expect(lines[2]).toBe('Source: OSM')
    expect(lines[3]).toMatch(/^Lock-Ad record last updated: /)
    expect(lines[4]).toBe('Presence and operation are not verified.')
  })

  it('renders mapped and community-supplied text as text, not HTML', () => {
    const untrustedName = '<img src=x onerror=alert(1)>'
    const popup = createSafetySignalPopup({
      name: untrustedName,
      signal_type: 'CCTV',
      source: 'OSM',
    })

    expect(popup.querySelector('img')).toBeNull()
    expect(popup.firstChild.textContent).toBe(untrustedName)
    expect(popup.textContent).toContain('Date unavailable')
  })

  it('labels incidents as unverified community reports and gives the report time', () => {
    const popup = createIncidentPopup({
      incident_type: 'LIGHTING',
      status: 'APPROVED',
      reported_at: '2026-01-01T00:00:00Z',
    })
    const lines = Array.from(popup.children, (child) => child.textContent)

    expect(lines[1]).toBe('Status: APPROVED')
    expect(lines[2]).toBe('Source: Community report (not independently verified)')
    expect(lines[3]).toMatch(/^Reported: /)
  })

  it('states that incomplete or missing map records do not indicate safety', () => {
    expect(MAP_DATA_COVERAGE_NOTICE).toContain('incomplete or outdated')
    expect(MAP_DATA_COVERAGE_NOTICE).toContain('A missing marker does not indicate safety')
    expect(MAP_DATA_COVERAGE_NOTICE).toContain('not confirmation that it is present or working')
  })
})
