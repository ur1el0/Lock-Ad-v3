import { useState } from 'react';
import { createIncident } from '../api/safety';
import { APIError } from '../api/client';
import { AlertTriangle, ShieldAlert, LightbulbOff, Car } from 'lucide-react';

const INCIDENT_TYPES = [
    { id: 'LIGHTING', label: 'Lighting Issue', icon: LightbulbOff, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
    { id: 'HAZARD', label: 'Road Hazard', icon: AlertTriangle, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/30' },
    { id: 'INCIDENT', label: 'Security', icon: ShieldAlert, color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/30' },
    { id: 'ACCIDENT', label: 'Accident', icon: Car, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30' }
];

export function ReportModal({ lat, lng, onClose, onSuccess }) {
    const [incidentType, setIncidentType] = useState('HAZARD');
    const [description, setDescription] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        try {
            const reportData = new FormData();
            reportData.append('incident_type', incidentType);
            reportData.append('description', description);
            reportData.append('latitude', lat.toFixed(9));
            reportData.append('longitude', lng.toFixed(9));
            if (imageFile) {
                reportData.append('image', imageFile);
            }
            await createIncident(reportData);
            onSuccess();
        } catch (err) {
            setError(err instanceof APIError
                ? err.message
                : 'We couldn’t complete your request. Check your connection and try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 overflow-y-auto bg-black/60 backdrop-blur-sm z-[9999] flex justify-center items-start sm:items-center p-4 animate-in fade-in duration-200" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="my-auto max-h-[calc(100dvh-2rem)] overflow-y-auto bg-background border border-border p-6 rounded-2xl w-full max-w-sm shadow-2xl flex flex-col gap-5 animate-in zoom-in-95 duration-200">
                
                <div className="border-b border-border pb-3">
                    <h2 id="modal-title" className="m-0 text-xl font-extrabold text-foreground tracking-tight">Report an incident</h2>
                    <p className="m-0 mt-1 text-xs font-medium text-muted-foreground">
                        Location: <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">{lat.toFixed(4)}, {lng.toFixed(4)}</span>
                    </p>
                </div>
                
                {error && (
                    <div role="alert" className="bg-destructive/10 border border-destructive/20 text-destructive text-sm font-semibold p-3 rounded-xl animate-in slide-in-from-top-2">
                        {error}
                    </div>
                )}
                
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    
                    <div className="flex flex-col gap-2" role="group" aria-labelledby="incident-type-label">
                        <label id="incident-type-label" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Incident type</label>
                        <div className="grid grid-cols-2 gap-2">
                            {INCIDENT_TYPES.map((type) => {
                                const Icon = type.icon;
                                const isSelected = incidentType === type.id;
                                return (
                                    <button
                                        key={type.id}
                                        type="button"
                                        aria-pressed={isSelected}
                                        onClick={() => setIncidentType(type.id)}
                                        className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                                            isSelected 
                                                ? `${type.bg} ${type.border} ring-1 ring-inset ring-opacity-50 shadow-sm` 
                                                : 'bg-muted border-transparent hover:bg-muted/80 opacity-70 hover:opacity-100'
                                        }`}
                                    >
                                        <Icon className={`w-6 h-6 ${isSelected ? type.color : 'text-muted-foreground'}`} aria-hidden="true" />
                                        <span className={`text-xs font-bold ${isSelected ? type.color : 'text-muted-foreground'}`}>
                                            {type.label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5 mt-2">
                        <label htmlFor="incident-description" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Description (optional)</label>
                        <textarea 
                            id="incident-description"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            rows={2}
                            placeholder="Describe what happened or what others should know."
                            className="w-full bg-muted border border-input text-foreground text-sm font-medium rounded-xl p-3 focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none resize-none placeholder:text-muted-foreground/60"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="incident-image" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                            Photo (optional)
                        </label>
                        <input
                            id="incident-image"
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={event => {
                                const selectedFile = event.target.files?.[0] || null;
                                if (selectedFile && selectedFile.size > 5 * 1024 * 1024) {
                                    setImageFile(null);
                                    setError('Choose an image no larger than 5 MB.');
                                    event.target.value = '';
                                    return;
                                }
                                setError(null);
                                setImageFile(selectedFile);
                            }}
                            disabled={isSubmitting}
                            aria-describedby="incident-image-help"
                            className="w-full text-sm text-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-xs file:font-bold file:text-secondary-foreground"
                        />
                        <p id="incident-image-help" className="text-xs text-muted-foreground m-0">
                            Use a JPEG, PNG, or WebP image no larger than 5 MB. If you attach a photo, we send it and your report description to Google Gemini to create a review aid. A moderator makes the decision.
                        </p>
                    </div>

                    <div className="flex justify-end gap-3 mt-1 pt-4 border-t border-border">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-secondary text-secondary-foreground text-xs font-bold rounded-xl hover:bg-secondary/80 transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="px-4 py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-xl shadow-lg shadow-primary/20 hover:-translate-y-0.5 hover:shadow-primary/30 transition-all disabled:opacity-70 disabled:hover:translate-y-0 flex items-center justify-center min-w-[100px]"
                        >
                            {isSubmitting ? 'Submitting…' : 'Submit report'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
