import Parser from "rss-parser";

export type NasaFeedItemType = "article" | "image" | "video";

export interface NasaFeedItem {
  id: string;
  type: NasaFeedItemType;
  title: string;
  description: string;
  url: string;
  thumbnailUrl: string | null;
  publishedAt: string;
}

export interface NasaFeed {
  articles: NasaFeedItem[];
  media: NasaFeedItem[];
}

const NASA_IMAGES_API = "https://images-api.nasa.gov/search";
// NASA Missions blog — updated multiple times daily during active missions
const NASA_MISSIONS_RSS_URL = "https://www.nasa.gov/blogs/missions/feed/";
// Only show items tagged with these Artemis categories
const ARTEMIS_CATEGORIES = new Set(["Artemis", "Artemis 2", "Artemis II"]);

/** Extract the first <img src="..."> URL from an HTML string */
function extractFirstImageUrl(html: string): string | null {
  const match = /src="(https:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i.exec(html);
  return match?.[1] ?? null;
}

interface NasaImageApiItem {
  data: Array<{
    nasa_id: string;
    title: string;
    description: string;
    date_created: string;
    media_type: string;
  }>;
  links?: Array<{
    href: string;
    rel: string;
  }>;
}

interface NasaImageApiResponse {
  collection: {
    items: NasaImageApiItem[];
  };
}

async function fetchNasaMedia(): Promise<NasaFeedItem[]> {
  const params = new URLSearchParams({
    q: "artemis",
    media_type: "image,video",
    page_size: "20",
  });

  const res = await fetch(`${NASA_IMAGES_API}?${params.toString()}`, {
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`NASA Images API error: ${res.status}`);
  }

  const json = (await res.json()) as NasaImageApiResponse;
  const items = json.collection.items;

  return items
    .filter((item) => item.data.length > 0)
    .map((item): NasaFeedItem => {
      const data = item.data[0];
      if (!data) throw new Error("Unexpected empty data array");

      const previewLink = item.links?.find((l) => l.rel === "preview");
      const thumbnailUrl = previewLink?.href ?? null;

      return {
        id: data.nasa_id,
        type: data.media_type === "video" ? "video" : "image",
        title: data.title,
        description: data.description,
        url: `https://images.nasa.gov/details/${data.nasa_id}`,
        thumbnailUrl,
        publishedAt: data.date_created,
      };
    });
}

async function fetchNasaArticles(): Promise<NasaFeedItem[]> {
  const parser = new Parser({
    customFields: {
      item: [["content:encoded", "contentEncoded"]],
    },
  });

  const feed = await parser.parseURL(NASA_MISSIONS_RSS_URL);

  return feed.items
    .filter((item) => {
      if (!item.title || !item.link) return false;
      const categories = (item.categories ?? []) as string[];
      return categories.some((c) => ARTEMIS_CATEGORIES.has(c));
    })
    .map((item, index): NasaFeedItem => {
      const itemRecord = item as { contentEncoded?: string };
      const thumbnailUrl = itemRecord.contentEncoded
        ? extractFirstImageUrl(itemRecord.contentEncoded)
        : null;

      return {
        id: item.guid ?? item.link ?? `rss-${index}`,
        type: "article",
        title: item.title ?? "Untitled",
        description: item.contentSnippet ?? item.summary ?? "",
        url: item.link ?? "#",
        thumbnailUrl,
        publishedAt: item.isoDate ?? item.pubDate ?? new Date().toISOString(),
      };
    });
}

export async function fetchNasaFeed(): Promise<NasaFeed> {
  const [media, articles] = await Promise.allSettled([fetchNasaMedia(), fetchNasaArticles()]);

  return {
    articles: articles.status === "fulfilled" ? articles.value : [],
    media: media.status === "fulfilled" ? media.value : [],
  };
}
