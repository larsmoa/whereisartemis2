"use client";

/**
 * Active mission stream — update this video ID when a new mission event starts.
 * Set to null when no dedicated mission stream is active; falls back to ISS_STREAM_ID.
 */
const MISSION_STREAM_ID: string | null = "m3kR2KK8TEs";

/** NASA ISS 24/7 live stream — always available as a fallback */
const ISS_STREAM_ID = "k43fLnlvKtY";

const videoId = MISSION_STREAM_ID ?? ISS_STREAM_ID;
const isMissionStream = MISSION_STREAM_ID !== null;

interface YouTubeEmbedProps {
  className?: string;
  /** When true, renders without the left border (used in full-width prominence mode) */
  borderless?: boolean;
}

export function YouTubeEmbed({
  className = "",
  borderless = false,
}: YouTubeEmbedProps): React.JSX.Element {
  const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=0&rel=0`;
  const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;

  return (
    <div
      className={`flex flex-col bg-black ${borderless ? "" : "border-l border-white/10"} ${className}`}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
        <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
          {isMissionStream ? "Mission Stream" : "ISS Live"}
        </span>
        <a
          href={watchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-zinc-600 underline transition-colors hover:text-zinc-400"
        >
          Watch on YouTube ↗
        </a>
      </div>
      <div className="relative min-h-0 w-full flex-1">
        <div className="absolute inset-0">
          <iframe
            src={embedUrl}
            title={isMissionStream ? "NASA Artemis II Mission Stream" : "NASA ISS Live Stream"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="h-full w-full border-0"
          />
        </div>
      </div>
    </div>
  );
}
