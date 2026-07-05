const LABELS: Record<string, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No show",
  RESCHEDULED: "Rescheduled",
};

export function StatusBadge({ status }: { status: string }) {
  return <span className={`badge badge--${status.toLowerCase()}`}>{LABELS[status] ?? status}</span>;
}
