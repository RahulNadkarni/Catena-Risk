import type { SafetyEventItem } from "@/app/actions/dispatch";

const EVENT_COLOR: Record<string, string> = {
  speeding: "text-red-600 bg-red-100",
  "hard braking": "text-orange-600 bg-orange-100",
  "harsh cornering": "text-amber-600 bg-amber-100",
  "hard acceleration": "text-amber-600 bg-amber-100",
  "roll stability": "text-red-600 bg-red-100",
  seatbelt: "text-blue-600 bg-blue-100",
  distraction: "text-purple-600 bg-purple-100",
};

function eventBadgeClass(eventType: string) {
  const key = Object.keys(EVENT_COLOR).find((k) => eventType.toLowerCase().includes(k));
  return key ? EVENT_COLOR[key]! : "text-gray-600 bg-gray-100";
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60_000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  return `${hrs}h ago`;
}

export function SafetyFeed({ events }: { events: SafetyEventItem[] }) {
  if (events.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card px-4 py-8 text-center text-sm text-muted-foreground">
        No safety events in the last 24 hours.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card divide-y divide-border overflow-hidden">
      {events.map((e) => (
        <div key={e.id} className="flex items-start gap-3 px-4 py-3">
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold capitalize ${eventBadgeClass(e.eventType)}`}>
            {e.eventType}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{e.driverName}</p>
            {e.location && (
              <p className="text-xs text-muted-foreground truncate">{e.location}</p>
            )}
          </div>
          <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {relativeTime(e.occurredAt)}
          </span>
        </div>
      ))}
    </div>
  );
}
