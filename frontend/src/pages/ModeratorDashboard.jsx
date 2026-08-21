import useSWR from "swr";
import { Link } from "react-router-dom"
import { getAllIncidentReports, updateIncidentReport } from "../api/safety";
import { ArrowLeft, CheckCircle, XCircle, ShieldAlert, AlertTriangle, LightbulbOff, Car, Clock } from "lucide-react";

export function ModeratorDashboard() {
    const { data, error, isLoading, mutate } = useSWR('/api/safety/incidents/', getAllIncidentReports);
    
    // DRF Pagination returns { results: [...] }
    const reports = data?.results || data || [];
    const loading = isLoading;

    async function handleStatusChange(id, newStatus) {
        try {
            await updateIncidentReport(id, { status: newStatus })
            mutate(); // Trigger a re-fetch to sync with backend
        } catch (err) {
            console.error(err);
            alert('Failed to update status')
        }
    }

    const getIcon = (type) => {
        switch(type) {
            case 'LIGHTING': return <LightbulbOff className="w-4 h-4 text-amber-500" aria-hidden="true" />;
            case 'HAZARD': return <AlertTriangle className="w-4 h-4 text-orange-500" aria-hidden="true" />;
            case 'INCIDENT': return <ShieldAlert className="w-4 h-4 text-rose-500" aria-hidden="true" />;
            case 'ACCIDENT': return <Car className="w-4 h-4 text-red-500" aria-hidden="true" />;
            default: return <AlertTriangle className="w-4 h-4 text-muted-foreground" aria-hidden="true" />;
        }
    }

    return (
        <div className="min-h-screen bg-background p-6 md:p-12 animate-in fade-in duration-300">
            <div className="max-w-6xl mx-auto flex flex-col gap-8">
                
                <div className="flex justify-between items-center bg-card p-6 rounded-3xl border border-border shadow-sm">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-foreground m-0">Moderator Dashboard</h1>
                        <p className="text-sm font-medium text-muted-foreground mt-1">Review and manage community incident reports</p>
                    </div>
                    <Link to="/" className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground text-sm font-bold rounded-xl hover:bg-secondary/80 transition-colors">
                        <ArrowLeft className="w-4 h-4" /> Back to Map
                    </Link>
                </div>
                
                {error ? (
                    <div className="bg-card p-12 rounded-3xl border border-border shadow-sm text-center">
                        <XCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-foreground m-0">Connection Error</h3>
                        <p className="text-muted-foreground mt-2">Failed to fetch the latest incident reports.</p>
                    </div>
                ) : loading ? (
                    <div className="flex justify-center p-12">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : reports.length === 0 ? (
                    <div className="bg-card p-12 rounded-3xl border border-border shadow-sm text-center">
                        <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-foreground m-0">All Caught Up!</h3>
                        <p className="text-muted-foreground mt-2">There are no pending reports to review at this time.</p>
                    </div>
                ) : (
                    <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse" aria-label="Incident Reports Table">
                                <thead>
                                    <tr className="bg-muted/50 border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                                        <th className="p-4 font-bold">ID</th>
                                        <th className="p-4 font-bold">Incident Type</th>
                                        <th className="p-4 font-bold">Description</th>
                                        <th className="p-4 font-bold">Status</th>
                                        <th className="p-4 font-bold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {reports.map(report => (
                                        <tr key={report.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="p-4">
                                                <span className="font-mono text-xs font-bold text-muted-foreground">#{report.id}</span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                                                    {getIcon(report.incident_type)}
                                                    {report.incident_type}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                {report.description ? (
                                                    <p className="text-sm font-medium text-foreground max-w-xs truncate m-0">{report.description}</p>
                                                ) : (
                                                    <em className="text-sm text-muted-foreground/50">No description</em>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                                                    report.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 
                                                    report.status === 'PENDING' ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' : 
                                                    'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                                                }`}>
                                                    {report.status === 'PENDING' && <Clock className="w-3 h-3" />}
                                                    {report.status}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right flex justify-end gap-2">
                                                <button 
                                                    onClick={() => handleStatusChange(report.id, 'APPROVED')}
                                                    disabled={report.status === 'APPROVED'}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white text-xs font-bold rounded-lg hover:bg-emerald-600 transition-colors disabled:opacity-30 disabled:hover:bg-emerald-500"
                                                >
                                                    <CheckCircle className="w-3.5 h-3.5" /> Approve
                                                </button>
                                                <button 
                                                    onClick={() => handleStatusChange(report.id, 'SPAM')}
                                                    disabled={report.status === 'SPAM'}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500 text-white text-xs font-bold rounded-lg hover:bg-rose-600 transition-colors disabled:opacity-30 disabled:hover:bg-rose-500"
                                                >
                                                    <XCircle className="w-3.5 h-3.5" /> Reject
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}