import { useState } from 'react';
import { createIncident } from '../api/safety';

export function ReportModal({ lat, lng, onClose, onSuccess }) {
    const [incidentType, setIncidentType] = useState('HAZARD');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        try {
            await createIncident({
                incident_type: incidentType,
                description,
                latitude: lat.toFixed(9),
                longitude: lng.toFixed(9)
            });
            onSuccess();
        } catch (err) {
            setError(err.message || 'Failed to submit report. Ensure you are logged in.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999,
            display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
            <div style={{
                background: 'white', padding: '24px', borderRadius: '8px', 
                width: '320px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}>
                <h2 style={{marginTop: 0}}>Report Incident</h2>
                
                {error && <div style={{ color: 'red', marginBottom: '12px', fontSize: '14px' }}>{error}</div>}
                
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                        Location: {lat.toFixed(4)}, {lng.toFixed(4)}
                    </div>

                    <label style={{ display: 'flex', flexDirection: 'column', fontSize: '14px' }}>
                        Incident Type
                        <select 
                            value={incidentType} 
                            onChange={e => setIncidentType(e.target.value)}
                            style={{ padding: '8px', marginTop: '4px' }}
                        >
                            <option value="LIGHTING">Lighting Issue</option>
                            <option value="HAZARD">Road/Obstruction Hazard</option>
                            <option value="INCIDENT">Security Incident</option>
                            <option value="ACCIDENT">Traffic Accident</option>
                        </select>
                    </label>

                    <label style={{ display: 'flex', flexDirection: 'column', fontSize: '14px' }}>
                        Description (Optional)
                        <textarea 
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            rows={3}
                            style={{ padding: '8px', marginTop: '4px', resize: 'vertical' }}
                        />
                    </label>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
                        <button type="button" onClick={onClose} disabled={isSubmitting} style={{ padding: '8px 12px' }}>
                            Cancel
                        </button>
                        <button type="submit" disabled={isSubmitting} style={{ padding: '8px 12px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                            {isSubmitting ? 'Submitting...' : 'Submit'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
