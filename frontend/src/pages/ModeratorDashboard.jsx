import { useState, useEffect } from "react";
import { Link, useFetcher } from "react-router-dom"
import { getAllIncidentReports, updateIncidentReport } from "../api/safety";

export function ModeratorDashboard() {
    const [reports, setReports] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchReports()
    }, [])

    async function handleStatusChange(id, newStatus) {
        try {
            await updateIncidentReport(id, { status: newStatus })
            setReports(reports.map(r => r.id === id ? { ...r, status: newStatus } : r))
        } catch (err) {
            alert('Failed to update status')
        }
    }

    return (
        <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 style={{ margin: 0 }}>Moderator Dashboard</h1>
                <Link to="/" style={{ color: '#2563eb', textDecoration: 'none' }}>&larr; Back to Map</Link>
            </div>
            
            {loading ? (
                <p>Loading reports...</p>
            ) : reports.length === 0 ? (
                <p>No reports found.</p>
            ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <thead>
                        <tr style={{ background: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
                            <th style={{ padding: '12px' }}>ID</th>
                            <th style={{ padding: '12px' }}>Type</th>
                            <th style={{ padding: '12px' }}>Description</th>
                            <th style={{ padding: '12px' }}>Status</th>
                            <th style={{ padding: '12px' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {reports.map(report => (
                            <tr key={report.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <td style={{ padding: '12px' }}>#{report.id}</td>
                                <td style={{ padding: '12px', fontWeight: 'bold' }}>{report.incident_type}</td>
                                <td style={{ padding: '12px' }}>{report.description || <em style={{color: '#9ca3af'}}>No description</em>}</td>
                                <td style={{ padding: '12px' }}>
                                    <span style={{
                                        padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold',
                                        background: report.status === 'APPROVED' ? '#d1fae5' : report.status === 'PENDING' ? '#fef3c7' : '#fee2e2',
                                        color: report.status === 'APPROVED' ? '#065f46' : report.status === 'PENDING' ? '#92400e' : '#991b1b'
                                    }}>
                                        {report.status}
                                    </span>
                                </td>
                                <td style={{ padding: '12px', display: 'flex', gap: '8px' }}>
                                    <button 
                                        onClick={() => handleStatusChange(report.id, 'APPROVED')}
                                        disabled={report.status === 'APPROVED'}
                                        style={{ padding: '4px 8px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', opacity: report.status === 'APPROVED' ? 0.5 : 1 }}
                                    >
                                        Approve
                                    </button>
                                    <button 
                                        onClick={() => handleStatusChange(report.id, 'SPAM')}
                                        disabled={report.status === 'SPAM'}
                                        style={{ padding: '4px 8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', opacity: report.status === 'SPAM' ? 0.5 : 1 }}
                                    >
                                        Reject (Spam)
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
}