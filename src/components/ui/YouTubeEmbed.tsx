"use client";

const NASA_CHANNEL_ID = "UCLA_DiR1FfKNvjuUpBHmylQ";

interface YouTubeEmbedProps {
  className?: string;
}

export function YouTubeEmbed({ className = "" }: YouTubeEmbedProps): React.JSX.Element {
  const embedUrl = `https://www.youtube.com/embed/live_streaming?channel=${NASA_CHANNEL_ID}&autoplay=0&rel=0`;

  return (
    <div className={`flex flex-col border-l border-white/10 bg-black ${className}`}>
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
        <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Live Stream
        </span>
        <a
          href={`https://www.youtube.com/@NASA/streams`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-zinc-600 underline hover:text-zinc-400 transition-colors"
        >
          NASA on YouTube ↗
        </a>
      </div>
      <div className="relative w-full flex-1 min-h-0">
        <div className="absolute inset-0">
          <iframe
            src={embedUrl}
            title="NASA Live Stream"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="h-full w-full border-0"
          />
        </div>
      </div>
    </div>
  );
}
