import { describe, expect, it, vi } from 'vitest'

import { getAllPages } from '../api/client'
import { getEmergencyContacts } from '../api/emergency'
import { getSavedRoutes } from '../api/navigation'
import {
  fetchIncidents,
  fetchSafetySignals,
  getAllIncidentReports,
} from '../api/safety'

function jsonResponse(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: name => name.toLowerCase() === 'content-type'
        ? 'application/json'
        : null,
    },
    json: async () => data,
  }
}

function mockTwoPageList(firstPath) {
  const secondPath = firstPath + (firstPath.includes('?') ? '&' : '?') + 'page=2'
  const pages = new Map([
    [firstPath, {
      count: 2,
      next: 'http://127.0.0.1:8004' + secondPath,
      previous: null,
      results: [{ id: 1 }],
    }],
    [secondPath, {
      count: 2,
      next: null,
      previous: 'http://127.0.0.1:8004' + firstPath,
      results: [{ id: 2 }],
    }],
  ])
  const fetchMock = vi.fn(async path => {
    const page = pages.get(path)
    if (!page) throw new Error('Unexpected request: ' + path)
    return jsonResponse(page)
  })

  vi.stubGlobal('fetch', fetchMock)
  return { fetchMock, secondPath }
}

describe('paginated API collection helpers', () => {
  const collectionEndpoints = [
    ['saved routes', getSavedRoutes, '/api/navigation/saved-routes/'],
    ['emergency contacts', getEmergencyContacts, '/api/emergency/contacts/'],
    ['moderator reports', getAllIncidentReports, '/api/safety/incidents/'],
  ]

  for (const [name, load, firstPath] of collectionEndpoints) {
    it('returns all pages for ' + name, async () => {
      const { fetchMock, secondPath } = mockTwoPageList(firstPath)

      await expect(load()).resolves.toEqual([{ id: 1 }, { id: 2 }])
      expect(fetchMock.mock.calls.map(([path]) => path))
        .toEqual([firstPath, secondPath])
    })
  }

  const bounds = {
    min_lat: '13.9',
    max_lat: '14.0',
    min_lng: '121.5',
    max_lng: '121.7',
  }
  const query = new URLSearchParams(bounds).toString()
  const mapEndpoints = [
    ['safety signals', fetchSafetySignals, '/api/safety/signals/?' + query],
    ['incident reports', fetchIncidents, '/api/safety/incidents/?' + query],
  ]

  for (const [name, load, firstPath] of mapEndpoints) {
    it('preserves bounding-box filters across pages for ' + name, async () => {
      const { fetchMock, secondPath } = mockTwoPageList(firstPath)

      await expect(load(bounds)).resolves.toEqual([{ id: 1 }, { id: 2 }])
      expect(fetchMock.mock.calls.map(([path]) => path))
        .toEqual([firstPath, secondPath])
    })
  }

  it('rejects pagination links outside the API without requesting them', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      count: 0,
      next: 'https://untrusted.example/collect',
      previous: null,
      results: [],
    }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(getAllPages('/api/safety/incidents/'))
      .rejects.toThrow('outside the API')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('stops if the server repeats a page link', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      count: 1,
      next: '/api/safety/incidents/',
      previous: null,
      results: [{ id: 1 }],
    }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(getAllPages('/api/safety/incidents/'))
      .rejects.toThrow('repeated pagination link')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
