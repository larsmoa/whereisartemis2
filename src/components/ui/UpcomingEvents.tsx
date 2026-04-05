"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import type { ArtemisEvent } from "@/types";
import { formatElapsed } from "@/lib/format";
import eventsData from "@/data/events.json";

function EventCard({ event }: { event: ArtemisEvent }): React.JSX.Element {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNow(Date.now());
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      clearInterval(interval);
    };
  }, []);

  const date = new Date(event.timestamp);
  const diffSeconds = now !== null ? Math.max(0, Math.floor((date.getTime() - now) / 1000)) : 0;
  const countdown = formatElapsed(diffSeconds);

  const formattedDate = date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });

  const content = (
    <>
      {event.thumbnail ? (
        <div className="relative aspect-video w-full overflow-hidden bg-zinc-900">
          <Image
            src={event.thumbnail}
            alt={event.name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            unoptimized
          />
          <div className="absolute bottom-2 right-2 rounded bg-black/80 px-2 py-1 text-[10px] sm:text-xs sm:px-2.5 sm:py-1 font-mono font-medium text-white backdrop-blur-sm">
            T- {countdown}
          </div>
        </div>
      ) : (
        <div className="relative flex aspect-video w-full items-center justify-center bg-zinc-900">
          <span className="text-xs text-zinc-600">No image</span>
          <div className="absolute bottom-2 right-2 rounded bg-black/80 px-2 py-1 text-[10px] sm:text-xs sm:px-2.5 sm:py-1 font-mono font-medium text-white backdrop-blur-sm">
            T- {countdown}
          </div>
        </div>
      )}
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <p className="line-clamp-2 text-sm font-semibold leading-snug text-white">{event.name}</p>
        <p className="text-xs font-medium text-zinc-300">{formattedDate}</p>
        {event.description && (
          <p className="line-clamp-3 text-xs leading-relaxed text-zinc-400">{event.description}</p>
        )}
      </div>
    </>
  );

  if (event.url) {
    return (
      <a
        href={event.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex flex-col overflow-hidden rounded-xl border border-white/10 bg-white/5 transition-colors hover:border-white/20 hover:bg-white/10"
      >
        {content}
      </a>
    );
  }

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-white/10 bg-white/5">
      {content}
    </div>
  );
}

export function UpcomingEvents(): React.JSX.Element {
  const [visibleCount, setVisibleCount] = useState(4);
  const now = new Date();

  // Parse and sort events chronologically, filter out past events
  const upcomingEvents = (eventsData as ArtemisEvent[])
    .filter((event) => new Date(event.timestamp) >= now)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const visibleEvents = upcomingEvents.slice(0, visibleCount);

  return (
    <section className="border-t border-white/10 bg-black/80 backdrop-blur-sm">
      <div className="px-4 pt-4 pb-2 sm:px-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Upcoming Events
        </h2>
      </div>

      <div className="px-4 pb-4 sm:px-6">
        {upcomingEvents.length === 0 ? (
          <p className="py-6 text-center text-sm text-zinc-600">
            No upcoming events scheduled at this time.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {visibleEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
            {visibleCount < upcomingEvents.length && (
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setVisibleCount((v) => v + 4);
                  }}
                  className="rounded-full border border-white/10 bg-white/5 px-6 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/10"
                >
                  Load more
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
