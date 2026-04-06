"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useLatestImages } from "@/hooks/useLatestImages";
import type { ScrapedImage } from "@/hooks/useLatestImages";

function ImageCard({ item }: { item: ScrapedImage }): React.JSX.Element {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col overflow-hidden rounded-xl border border-white/10 bg-white/5 transition-colors hover:border-white/20 hover:bg-white/10"
    >
      {item.thumbnailUrl ? (
        <div className="relative aspect-video w-full overflow-hidden bg-zinc-900">
          <Image
            src={item.thumbnailUrl}
            alt={item.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            unoptimized
          />
          {item.url.includes("video") && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm">
                <svg className="h-4 w-4 fill-white" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          )}
          {item.url.includes("video") && (
            <div className="absolute left-2 top-2">
              <span className="rounded-full border border-white/10 bg-black/60 px-2 py-0.5 text-[10px] uppercase tracking-wider text-zinc-400 backdrop-blur-sm">
                Video
              </span>
            </div>
          )}
          {!item.url.includes("video") && (
            <div className="absolute left-2 top-2">
              <span className="rounded-full border border-white/10 bg-black/60 px-2 py-0.5 text-[10px] uppercase tracking-wider text-zinc-400 backdrop-blur-sm">
                Photo
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex aspect-video w-full items-center justify-center bg-zinc-900">
          <span className="text-xs text-zinc-600">No image</span>
        </div>
      )}
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <p className="line-clamp-2 text-sm font-semibold leading-snug text-white">{item.title}</p>
        {item.publishedAt && (
          <p className="mt-auto pt-2 text-[10px] text-zinc-600">
            {new Date(item.publishedAt).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </p>
        )}
      </div>
    </a>
  );
}

function SkeletonCard(): React.JSX.Element {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-white/10 bg-white/5">
      <div className="aspect-video w-full animate-pulse bg-zinc-800" />
      <div className="flex flex-col gap-2 p-3">
        <div className="h-4 w-3/4 animate-pulse rounded bg-zinc-800" />
        <div className="h-3 w-full animate-pulse rounded bg-zinc-800" />
      </div>
    </div>
  );
}

export function ImageReel(): React.JSX.Element | null {
  const { data, isPending, error } = useLatestImages();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const showPending = !mounted || isPending;
  const showError = mounted && error;
  const showEmpty = mounted && !isPending && !error && (!data || data.length === 0);
  const showContent = mounted && !isPending && data && data.length > 0;

  if (showError || showEmpty) {
    return null; // Fail gracefully by hiding the reel
  }

  return (
    <section className="border-t border-white/10 bg-black/80 backdrop-blur-sm">
      <div className="px-4 pt-4 pb-2 sm:px-6">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
          Latest Images
        </h2>
      </div>

      <div className="px-4 pb-4 sm:px-6">
        {showPending && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {showContent && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {data.slice(0, 4).map((item) => (
              <ImageCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
