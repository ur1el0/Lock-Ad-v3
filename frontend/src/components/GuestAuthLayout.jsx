import { MapPin, Route, ShieldCheck } from 'lucide-react'

const routeSteps = [
    {
        icon: Route,
        title: 'Preview your route',
        description: 'Review trip details before you travel.',
        tone: 'bg-emerald-300/15 text-emerald-200',
    },
    {
        icon: MapPin,
        title: 'Review local information',
        description: 'See approved reports and available public signals on the map.',
        tone: 'bg-amber-300/15 text-amber-200',
    },
    {
        icon: ShieldCheck,
        title: 'Share a report',
        description: 'Moderators review community reports before they appear on the map.',
        tone: 'bg-sky-300/15 text-sky-200',
    },
]

function BrandMark({ compact = false }) {
    return (
        <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-400/15 text-emerald-700 ring-1 ring-emerald-700/10">
                <MapPin className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="leading-tight">
                <span className="block text-base font-bold tracking-tight text-foreground">Lock-Ad</span>
                {!compact && (
                    <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        Routes with local context
                    </span>
                )}
            </span>
        </div>
    )
}

export function GuestAuthLayout({ children }) {
    return (
        <main className="min-h-svh bg-[#f3f6f3] text-foreground">
            <div className="grid min-h-svh lg:grid-cols-[minmax(20rem,0.92fr)_minmax(0,1.08fr)]">
                <aside className="relative hidden overflow-hidden bg-primary px-10 py-12 text-primary-foreground lg:flex xl:px-16">
                    <div className="relative z-10 mx-auto flex w-full max-w-xl flex-col">
                        <div className="flex items-center gap-3">
                            <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-300/15 text-emerald-200 ring-1 ring-white/10">
                                <MapPin className="h-5 w-5" aria-hidden="true" />
                            </span>
                            <span>
                                <span className="block text-lg font-bold tracking-tight">Lock-Ad</span>
                                <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-300">
                                    Routes with local context
                                </span>
                            </span>
                        </div>

                        <div className="my-auto py-16">
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">
                                Plan with local context
                            </p>
                            <h2 className="mt-5 max-w-md text-4xl font-semibold leading-[1.12] tracking-tight xl:text-5xl">
                                See route context before you go.
                            </h2>
                            <p className="mt-5 max-w-md text-base leading-7 text-slate-300">
                                Preview your route with approved community reports and public signals when available.
                            </p>

                            <div className="relative mt-10">
                                <div
                                    aria-hidden="true"
                                    className="absolute bottom-5 left-4 top-5 border-l border-dashed border-slate-500/70"
                                />
                                <ol className="space-y-6">
                                    {routeSteps.map(({ icon: Icon, title, description, tone }) => (
                                        <li key={title} className="relative flex items-start gap-4">
                                            <span className={`relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full ring-4 ring-primary ${tone}`}>
                                                <Icon className="h-4 w-4" aria-hidden="true" />
                                            </span>
                                            <span className="pt-0.5">
                                                <span className="block text-sm font-semibold text-white">{title}</span>
                                                <span className="mt-1 block text-sm leading-5 text-slate-300">{description}</span>
                                            </span>
                                        </li>
                                    ))}
                                </ol>
                            </div>
                        </div>

                        <p className="max-w-sm text-xs leading-5 text-slate-400">
                            Coverage varies by area. Route information can inform your decisions, but it cannot guarantee safety.
                        </p>
                    </div>
                </aside>

                <section
                    aria-label="Account access"
                    className="flex min-h-svh items-center justify-center px-4 py-8 sm:px-6 lg:px-10"
                >
                    <div className="w-full max-w-[27rem]">
                        <div className="mb-6 px-1 lg:hidden">
                            <BrandMark compact />
                        </div>
                        <div className="rounded-[1.5rem] border border-slate-200/90 bg-white px-6 py-8 shadow-[0_24px_70px_-38px_rgba(15,23,42,0.34)] sm:px-9 sm:py-10">
                            {children}
                        </div>
                    </div>
                </section>
            </div>
        </main>
    )
}
