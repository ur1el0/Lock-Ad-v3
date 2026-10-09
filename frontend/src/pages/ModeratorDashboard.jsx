import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { getAllIncidentReports, updateIncidentReport } from "../api/safety";
import { APIError } from "../api/client";
import {
    CheckCircle2,
    XCircle,
    ShieldAlert,
    AlertTriangle,
    LightbulbOff,
    Car,
    Clock,
    MapPin,
    Calendar
} from "lucide-react";

export function ModeratorDashboard() {
    const { data, error, isLoading, mutate } = useSWR('/api/safety/incidents/', getAllIncidentReports);
    const [selectedImage, setSelectedImage] = useState(null);
    const [isImageZoomed, setIsImageZoomed] = useState(false);
    const imageDialogRef = useRef(null);

    useEffect(() => {
        const dialog = imageDialogRef.current;
        if (!dialog) return;

        if (selectedImage && !dialog.open) {
            dialog.showModal();
        } else if (!selectedImage && dialog.open) {
            dialog.close();
        }
    }, [selectedImage]);

    const reports = data?.results || data || [];
    const loading = isLoading;

    async function handleStatusChange(id, newStatus) {
        try {
            await updateIncidentReport(id, { status: newStatus });
            mutate();
        } catch (err) {
            console.error(err);
            alert(err instanceof APIError
                ? err.message
                : 'We couldn’t update this report. Try again.');
        }
    }

    const getIcon = (type) => {
        switch(type) {
            case 'LIGHTING':
                return <LightbulbOff className="w-5 h-5 text-amber-500" aria-hidden="true" />;
            case 'HAZARD':
                return <AlertTriangle className="w-5 h-5 text-orange-500" aria-hidden="true" />;
            case 'INCIDENT':
                return <ShieldAlert className="w-5 h-5 text-rose-500" aria-hidden="true" />;
            case 'ACCIDENT':
                return <Car className="w-5 h-5 text-red-500" aria-hidden="true" />;
            default:
                return <AlertTriangle className="w-5 h-5 text-muted-foreground" aria-hidden="true" />;
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'APPROVED':
                return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
            case 'PENDING':
                return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
            default:
                return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20';
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground pb-24 md:pb-12 animate-in fade-in duration-300">
            {/* Sticky Mobile & Desktop Header */}
            <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border px-4 py-4 md:px-8">
                <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl md:text-2xl font-black tracking-tight m-0 text-foreground">
                            Incident Queue
                        </h1>
                        <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                            Review and moderate live community reports
                        </p>
                    </div>
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 md:px-8 pt-6">
                {error ? (
                    <div role="alert" className="bg-card p-8 rounded-3xl border border-border shadow-sm text-center">
                        <XCircle className="w-10 h-10 text-destructive mx-auto mb-3" aria-hidden="true" />
                        <h2 className="text-lg font-bold text-foreground m-0">Couldn’t load incident reports</h2>
                        <p className="text-sm text-muted-foreground mt-1">Reload this page to try again.</p>
                    </div>
                ) : loading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : reports.length === 0 ? (
                    <div className="bg-card p-10 rounded-3xl border border-border shadow-sm text-center">
                        <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" aria-hidden="true" />
                        <h2 className="text-lg font-bold text-foreground m-0">No reports need review</h2>
                        <p className="text-sm text-muted-foreground mt-1">There are no pending reports to moderate right now.</p>
                    </div>
                ) : (
                    <div
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                        role="region"
                        aria-label="Incident Reports Feed"
                    >
                        {reports.map((report) => (
                            <article
                                key={report.id}
                                className="bg-card/90 border border-border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between gap-4"
                            >
                                <div className="space-y-3">
                                    {/* Card Header: Type, ID & Status Badge */}
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-2.5">
                                            <div className="p-2 rounded-xl bg-muted">
                                                {getIcon(report.incident_type)}
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold text-foreground m-0 leading-tight">
                                                    {report.incident_type}
                                                </h3>
                                                <span className="font-mono text-[11px] text-muted-foreground">
                                                    #{report.id}
                                                </span>
                                            </div>
                                        </div>

                                        <span
                                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${getStatusBadge(report.status)}`}
                                        >
                                            {report.status === 'PENDING' && (
                                                <Clock className="w-3 h-3" aria-hidden="true" />
                                            )}
                                            {report.status}
                                        </span>
                                    </div>

                                    {/* Incident Description */}
                                    <p className="text-sm text-foreground/90 font-medium line-clamp-3 bg-muted/40 p-3 rounded-xl m-0 min-h-[54px]">
                                        {report.description || (
                                            <span className="text-muted-foreground/60 italic text-xs">
                                                No additional description provided.
                                            </span>
                                        )}
                                    </p>

                                    {report.image && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsImageZoomed(false);
                                                setSelectedImage(report);
                                            }}
                                            className="w-full text-left rounded-xl border border-border overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                                            aria-label={`View photo for incident report ${report.id}`}
                                        >
                                            <img
                                                src={report.image}
                                                alt={`Photo attached to incident report ${report.id}`}
                                                loading="lazy"
                                                className="w-full h-36 object-cover"
                                            />
                                            <span className="block px-3 py-2 text-xs font-semibold text-foreground">
                                                View attached photo
                                            </span>
                                        </button>
                                    )}

                                    {report.ai_analysis && (
                                        <section
                                            aria-label="AI-generated moderator review aid"
                                            className="rounded-xl border border-border bg-muted/40 p-3"
                                        >
                                            <h4 className="m-0 text-xs font-bold text-foreground">
                                                AI-generated review aid
                                            </h4>
                                            <p className="m-0 mt-1 text-[11px] text-muted-foreground">
                                                May be inaccurate. Review the photo and report yourself.
                                            </p>
                                            <p className="m-0 mt-2 text-sm text-foreground/90">
                                                {report.ai_analysis}
                                            </p>
                                        </section>
                                    )}

                                    {/* Location & Timestamp Metadata */}
                                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/60">
                                        <div className="flex items-center gap-1 font-mono">
                                            <MapPin className="w-3.5 h-3.5 text-muted-foreground/70" aria-hidden="true" />
                                            <span>
                                                {Number(report.latitude).toFixed(4)}, {Number(report.longitude).toFixed(4)}
                                            </span>
                                        </div>
                                        {report.reported_at && (
                                            <div className="flex items-center gap-1">
                                                <Calendar className="w-3.5 h-3.5 text-muted-foreground/70" aria-hidden="true" />
                                                <span>{new Date(report.reported_at).toLocaleDateString()}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="grid grid-cols-2 gap-2 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => handleStatusChange(report.id, 'APPROVED')}
                                        disabled={report.status === 'APPROVED'}
                                        className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 active:scale-[0.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100 shadow-sm"
                                        aria-label={`Approve incident report number ${report.id}`}
                                    >
                                        <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                                        <span>Approve</span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => handleStatusChange(report.id, 'SPAM')}
                                        disabled={report.status === 'SPAM'}
                                        className="w-full flex items-center justify-center gap-1.5 py-2.5 px-3 bg-destructive text-destructive-foreground text-xs font-bold rounded-xl hover:bg-destructive/90 active:scale-[0.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100 shadow-sm"
                                        aria-label={`Reject incident report number ${report.id} as spam`}
                                    >
                                        <XCircle className="w-4 h-4" aria-hidden="true" />
                                        <span>Reject</span>
                                    </button>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </main>

            <dialog
                ref={imageDialogRef}
                aria-labelledby="incident-image-dialog-title"
                onCancel={() => setSelectedImage(null)}
                onClose={() => setSelectedImage(null)}
                className="m-auto w-[calc(100vw-2rem)] max-w-4xl max-h-[90vh] overflow-auto rounded-2xl border border-border bg-background p-4 text-foreground shadow-2xl backdrop:bg-black/70"
            >
                {selectedImage && (
                    <div className="space-y-3">
                        <header className="flex items-start justify-between gap-4">
                            <div>
                                <h2 id="incident-image-dialog-title" className="m-0 text-base font-bold">
                                    Report #{selectedImage.id} photo
                                </h2>
                                <p className="m-0 mt-1 text-xs text-muted-foreground">
                                    AI output is only a review aid; make the moderation decision from the evidence.
                                </p>
                            </div>
                            <button
                                type="button"
                                autoFocus
                                onClick={() => setSelectedImage(null)}
                                className="rounded-lg border border-border px-3 py-2 text-sm font-semibold hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                            >
                                Close
                            </button>
                        </header>
                        <button
                            type="button"
                            aria-pressed={isImageZoomed}
                            onClick={() => setIsImageZoomed(zoomed => !zoomed)}
                            className="block max-w-full overflow-auto rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                        >
                            <img
                                src={selectedImage.image}
                                alt={`Full-size photo attached to incident report ${selectedImage.id}`}
                                className={isImageZoomed
                                    ? "max-w-none cursor-zoom-out"
                                    : "mx-auto max-h-[70vh] max-w-full cursor-zoom-in object-contain"}
                            />
                            <span className="sr-only">
                                {isImageZoomed ? "Zoom out" : "Zoom in"} photo
                            </span>
                        </button>
                    </div>
                )}
            </dialog>
        </div>
    );
}
