const formatTimestamp = (value) => {
  if (!value) return 'Date unavailable'

  const timestamp = new Date(value)
  return Number.isNaN(timestamp.getTime())
    ? 'Date unavailable'
    : timestamp.toLocaleString()
}

function createTextPopup(title, details) {
  const popup = document.createElement('div')
  const heading = document.createElement('strong')
  heading.textContent = title
  popup.append(heading)

  details.forEach((detail) => {
    const line = document.createElement('div')
    line.textContent = detail
    popup.append(line)
  })

  return popup
}

export function createSafetySignalPopup(signal) {
  return createTextPopup(signal.name || 'Mapped safety signal', [
    `Type: ${signal.signal_type}`,
    `Source: ${signal.source || 'Unknown'}`,
    `Lock-Ad record last updated: ${formatTimestamp(signal.updated_at)}`,
    'Presence and operation are not verified.',
  ])
}

export function createIncidentPopup(incident) {
  return createTextPopup(
    String(incident.incident_type || 'Community report').replace(/_/g, ' '),
    [
      `Status: ${incident.status || 'Unknown'}`,
      'Source: Community report (not independently verified)',
      `Reported: ${formatTimestamp(incident.reported_at)}`,
    ],
  )
}

export const MAP_DATA_COVERAGE_NOTICE =
  'Mapped features and community reports may be incomplete or outdated. A missing marker does not indicate safety, and a mapped light or camera is not confirmation that it is present or working.'
