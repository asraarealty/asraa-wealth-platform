"use client";

export type AlertSeverity = "low" | "medium" | "high";

export interface DashboardAlert {
  id: string;
  title: string;
  description: string;
  severity: AlertSeverity;
}

const SEVERITY_STYLES: Record<
  AlertSeverity,
  { badge: string; dot: string; icon: React.ReactNode }
> = {
  high: {
    dot: "bg-red-400",
    badge: "bg-red-500/10 text-red-400 border-red-500/20",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
      </svg>
    ),
  },
  medium: {
    dot: "bg-amber-400",
    badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
      </svg>
    ),
  },
  low: {
    dot: "bg-sky-400",
    badge: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    icon: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
      </svg>
    ),
  },
};

interface Props {
  alerts: DashboardAlert[];
}

export default function AlertsPanel({ alerts }: Props) {
  if (alerts.length === 0) {
    return (
      <div className="glass-card card-hover rounded-2xl p-5">
        <PanelHeader />
        <p className="text-sm text-gray-500 text-center py-8">
          No active alerts — all portfolios healthy.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card card-hover rounded-2xl p-5">
      <PanelHeader count={alerts.length} />
      <ul className="space-y-3 mt-4">
        {alerts.map((alert) => {
          const s = SEVERITY_STYLES[alert.severity];
          return (
            <li
              key={alert.id}
              className="rounded-xl p-3.5"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${s.badge}`}
                >
                  {s.icon}
                  {alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1)}
                </span>
              </div>
              <p className="text-sm font-semibold text-white">{alert.title}</p>
              <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                {alert.description}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function PanelHeader({ count }: { count?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
        style={{
          background: "rgba(239,68,68,0.12)",
          border: "1px solid rgba(239,68,68,0.2)",
        }}
      >
        <svg
          className="w-4 h-4 text-red-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
          />
        </svg>
      </div>
      <div>
        <p className="text-sm font-semibold text-white">Active Alerts</p>
        <p className="text-xs text-gray-400">System-generated portfolio alerts</p>
      </div>
      {count !== undefined && count > 0 && (
        <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-semibold">
          {count}
        </span>
      )}
    </div>
  );
}
