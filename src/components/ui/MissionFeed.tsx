"use client";

import { useState } from "react";
import Image from "next/image";
import { useNasaFeed } from "@/hooks/useNasaFeed";
import type { NasaFeedItem, NasaFeedItemType } from "@/lib/nasa-feed";

type FeedTab = "news" | "gallery";

function FeedCard({ item }: { item: NasaFeedItem }): React.JSX.Element {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex flex-col overflow-hidden rounded-xl border border-white/10 bg-white/5 transition-colors hover:border-white/20 hover:bg-white/10"
    >
      {item.thumbnailUrl && (
        <div className="relative aspect-video w-full overflow-hidden bg-zinc-900">
          <Image
            src={item.thumbnailUrl}
            alt={item.title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            unoptimized
          />
          {item.type === "video" && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-black/60 backdrop-blur-sm">
                <svg className="h-4 w-4 fill-white" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </div>
            </div>
          )}
        </div>
      )}
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <p className="line-clamp-2 text-sm font-semibold leading-snug text-white">{item.title}</p>
        {item.description && (
          <p className="line-clamp-3 text-xs leading-relaxed text-zinc-400">{item.description}</p>
        )}
        <p className="mt-auto pt-2 text-[10px] text-zinc-600">
          {new Date(item.publishedAt).toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </p>
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
        <div className="h-3 w-2/3 animate-pulse rounded bg-zinc-800" />
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest transition-colors ${
        active ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"
      }`}
    >
      {children}
    </button>
  );
}

function FeedTypeTag({ type }: { type: NasaFeedItemType }): React.JSX.Element | null {
  if (type === "article") return null;
  return (
    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-wider text-zinc-500">
      {type}
    </span>
  );
}

export function MissionFeed(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<FeedTab>("news");
  const { data, isPending, error } = useNasaFeed();

  const items = activeTab === "news" ? (data?.articles ?? []) : (data?.media ?? []);

  return (
    <section className="border-t border-white/10 bg-black/80 backdrop-blur-sm">
      <div className="px-4 pt-4 pb-2 sm:px-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
            Mission Coverage
          </h2>
          <div className="flex items-center gap-1">
            <TabButton
              active={activeTab === "news"}
              onClick={() => {
                setActiveTab("news");
              }}
            >
              News
            </TabButton>
            <TabButton
              active={activeTab === "gallery"}
              onClick={() => {
                setActiveTab("gallery");
              }}
            >
              Gallery
            </TabButton>
          </div>
        </div>
      </div>

      <div className="px-4 pb-4 sm:px-6">
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            Failed to load mission content
          </div>
        )}

        {isPending && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {!isPending && !error && items.length === 0 && (
          <p className="py-6 text-center text-sm text-zinc-600">No content available right now.</p>
        )}

        {!isPending && items.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => (
              <div key={item.id} className="relative">
                <FeedCard item={item} />
                <div className="absolute left-2 top-2">
                  <FeedTypeTag type={item.type} />
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="mt-4 text-center text-[10px] text-zinc-700">
          Content via{" "}
          <a
            href="https://images.nasa.gov"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-zinc-500"
          >
            NASA Image and Video Library
          </a>{" "}
          &amp;{" "}
          <a
            href="https://www.nasa.gov/artemis"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-zinc-500"
          >
            NASA Artemis News
          </a>
        </p>
      </div>
    </section>
  );
}
