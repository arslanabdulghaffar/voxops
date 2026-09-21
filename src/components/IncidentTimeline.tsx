"use client";

import type {
  TimelineEvent,
  TimelineEventType,
} from "@/lib/voxops/timeline";

type Props = {
  events: TimelineEvent[];
};

function getLabel(type: TimelineEventType) {
  switch (type) {
    case "incident":
      return "Incident";

    case "investigation":
      return "Investigation";

    case "proposal":
      return "Proposal";

    case "approval":
      return "Authorization";

    case "execution":
      return "Recovery";

    case "verification":
      return "Verification";
    case "safety":
      return "Safety";
  }
}

function getClasses(type: TimelineEventType) {
  switch (type) {
    case "incident":
      return "bg-red-500";

    case "investigation":
      return "bg-violet-500";

    case "proposal":
      return "bg-amber-500";

    case "approval":
      return "bg-blue-500";

    case "execution":
      return "bg-cyan-500";

    case "verification":
      return "bg-emerald-500";
  }
}

export default function IncidentTimeline({
  events,
}: Props) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">

      <div>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-gray-500">
          Incident Memory
        </p>

        <h2 className="mt-2 text-lg font-semibold">
          Incident Timeline
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Automatic audit trail of investigation,
          authorization and recovery.
        </p>
      </div>

      {events.length === 0 ? (
        <div className="mt-6 flex min-h-[220px] items-center justify-center rounded-xl border border-white/5 bg-black/20">

          <p className="max-w-sm text-center text-sm text-gray-600">
            Timeline events will appear automatically
            when an incident begins.
          </p>

        </div>
      ) : (
        <div className="mt-6 space-y-0">

          {events.map((event, index) => (
            <div
              key={event.id}
              className="relative flex gap-4 pb-6"
            >
              {index !== events.length - 1 && (
                <div className="absolute left-[7px] top-5 h-full w-px bg-white/10" />
              )}

              <div
                className={`relative mt-1 h-[15px] w-[15px] shrink-0 rounded-full ${getClasses(
                  event.type
                )}`}
              />

              <div className="min-w-0 flex-1">

                <div className="flex flex-wrap items-center justify-between gap-2">

                  <div className="flex items-center gap-2">

                    <span className="text-[10px] font-medium uppercase tracking-[0.16em] text-gray-500">
                      {getLabel(event.type)}
                    </span>

                    <h3 className="text-sm font-medium text-gray-200">
                      {event.title}
                    </h3>

                  </div>

                  <span className="text-[10px] text-gray-600">
                    {new Date(
                      event.timestamp
                    ).toLocaleTimeString()}
                  </span>

                </div>

                <p className="mt-1 text-xs leading-5 text-gray-500">
                  {event.detail}
                </p>

              </div>
            </div>
          ))}

        </div>
      )}

    </section>
  );
}