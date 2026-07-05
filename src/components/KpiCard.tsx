interface KpiCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  accent?: "default" | "active" | "warning";
}

export function KpiCard({ label, value, subtext, accent = "default" }: KpiCardProps) {
  const accentClasses = {
    default: "border-border",
    active: "border-primary bg-teal-50/50",
    warning: "border-warning bg-amber-50/50",
  };

  return (
    <div
      className={`rounded-2xl border bg-card p-4 shadow-sm ${accentClasses[accent]}`}
    >
      <p className="text-sm text-muted font-medium">{label}</p>
      <p className="text-3xl font-bold mt-1 tracking-tight">{value}</p>
      {subtext && <p className="text-xs text-muted mt-1">{subtext}</p>}
    </div>
  );
}
