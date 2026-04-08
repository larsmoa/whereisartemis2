import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { fetchNasaFeed } from "./nasa-feed";

// vi.hoisted ensures this variable is available inside the vi.mock factory
// (vi.mock is hoisted above all imports, so regular const declarations are not yet initialized)
const mockParseURL = vi.hoisted(() => vi.fn().mockResolvedValue({ items: [] }));

vi.mock(import("rss-parser"), () => ({
  default: vi.fn().mockImplementation(function (this: unknown) {
    void this;
    return { parseURL: mockParseURL };
  }),
}));

afterEach(() => {
  vi.unstubAllGlobals();
  mockParseURL.mockResolvedValue({ items: [] });
});

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeMediaApiResponse(items: unknown[] = []): {
  ok: boolean;
  json: () => Promise<unknown>;
} {
  return {
    ok: true,
    json: (): Promise<unknown> => Promise.resolve({ collection: { items } }),
  };
}

function makeMediaItem(
  overrides: Partial<{
    nasa_id: string;
    title: string;
    description: string;
    date_created: string;
    media_type: string;
    links: { href: string; rel: string }[];
  }> = {},
): unknown {
  return {
    data: [
      {
        nasa_id: overrides.nasa_id ?? "artemis-001",
        title: overrides.title ?? "Launch",
        description: overrides.description ?? "Description",
        date_created: overrides.date_created ?? "2026-04-02T02:00:00Z",
        media_type: overrides.media_type ?? "image",
      },
    ],
    links: overrides.links ?? [{ href: "https://example.com/thumb.jpg", rel: "preview" }],
  };
}

// ── fetchNasaFeed — media items ──────────────────────────────────────────────

describe("fetchNasaFeed", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeMediaApiResponse()));
  });

  it("returns empty arrays when both sources return no items", async () => {
    const result = await fetchNasaFeed();
    expect(result.articles).toEqual([]);
    expect(result.media).toEqual([]);
  });

  it("returns empty media array when media API responds with non-ok status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503 }));

    const result = await fetchNasaFeed();

    expect(result.media).toEqual([]);
  });

  it("returns empty media array when fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Network error")));

    const result = await fetchNasaFeed();

    expect(result.media).toEqual([]);
  });

  it("maps an image media item correctly", async () => {
    const item = makeMediaItem({ nasa_id: "img-001", media_type: "image" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeMediaApiResponse([item])));

    const result = await fetchNasaFeed();

    expect(result.media).toHaveLength(1);
    expect(result.media[0]?.type).toBe("image");
    expect(result.media[0]?.id).toBe("img-001");
    expect(result.media[0]?.thumbnailUrl).toBe("https://example.com/thumb.jpg");
  });

  it("maps a video media item type correctly", async () => {
    const item = makeMediaItem({ media_type: "video" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeMediaApiResponse([item])));

    const result = await fetchNasaFeed();

    expect(result.media[0]?.type).toBe("video");
  });

  it("sets thumbnailUrl to null when no preview link is present", async () => {
    const item = makeMediaItem({ links: [] });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeMediaApiResponse([item])));

    const result = await fetchNasaFeed();

    expect(result.media[0]?.thumbnailUrl).toBeNull();
  });

  it("filters out media items with empty data arrays", async () => {
    const emptyDataItem = { data: [], links: [] };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeMediaApiResponse([emptyDataItem])));

    const result = await fetchNasaFeed();

    expect(result.media).toHaveLength(0);
  });
});

// ── fetchNasaFeed — articles via RSS ────────────────────────────────────────

describe("fetchNasaFeed (RSS articles)", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeMediaApiResponse()));
  });

  it("returns articles tagged with an Artemis category", async () => {
    mockParseURL.mockResolvedValueOnce({
      items: [
        {
          title: "Artemis Update",
          link: "https://nasa.gov/artemis-update",
          guid: "guid-1",
          categories: ["Artemis II"],
          isoDate: "2026-04-03T10:00:00Z",
          contentSnippet: "Mission going well.",
          contentEncoded: '<p>Content <img src="https://example.com/img.jpg" /></p>',
        },
      ],
    });

    const result = await fetchNasaFeed();

    expect(result.articles).toHaveLength(1);
    expect(result.articles[0]?.title).toBe("Artemis Update");
    expect(result.articles[0]?.type).toBe("article");
  });

  it("excludes RSS items without Artemis categories", async () => {
    mockParseURL.mockResolvedValueOnce({
      items: [
        {
          title: "Unrelated",
          link: "https://nasa.gov/other",
          categories: ["Science"],
          isoDate: "2026-04-03T10:00:00Z",
        },
      ],
    });

    const result = await fetchNasaFeed();

    expect(result.articles).toHaveLength(0);
  });

  it("excludes RSS items missing title or link", async () => {
    mockParseURL.mockResolvedValueOnce({
      items: [{ title: null, link: null, categories: ["Artemis"] }],
    });

    const result = await fetchNasaFeed();

    expect(result.articles).toHaveLength(0);
  });

  it("returns empty articles array when RSS parseURL throws", async () => {
    mockParseURL.mockRejectedValueOnce(new Error("RSS error"));

    const result = await fetchNasaFeed();

    expect(result.articles).toEqual([]);
  });

  it("extracts thumbnailUrl from contentEncoded image src", async () => {
    mockParseURL.mockResolvedValueOnce({
      items: [
        {
          title: "Artemis Photo",
          link: "https://nasa.gov/photo",
          categories: ["Artemis"],
          isoDate: "2026-04-03T10:00:00Z",
          contentEncoded: '<p><img src="https://example.com/mission.jpg" /></p>',
        },
      ],
    });

    const result = await fetchNasaFeed();

    expect(result.articles[0]?.thumbnailUrl).toBe("https://example.com/mission.jpg");
  });

  it("sets thumbnailUrl to null when contentEncoded has no image", async () => {
    mockParseURL.mockResolvedValueOnce({
      items: [
        {
          title: "Artemis Text",
          link: "https://nasa.gov/text",
          categories: ["Artemis"],
          isoDate: "2026-04-03T10:00:00Z",
          contentEncoded: "<p>No images here.</p>",
        },
      ],
    });

    const result = await fetchNasaFeed();

    expect(result.articles[0]?.thumbnailUrl).toBeNull();
  });

  it("sets thumbnailUrl to null when contentEncoded is absent", async () => {
    mockParseURL.mockResolvedValueOnce({
      items: [
        {
          title: "Artemis Minimal",
          link: "https://nasa.gov/minimal",
          categories: ["Artemis"],
          isoDate: "2026-04-03T10:00:00Z",
        },
      ],
    });

    const result = await fetchNasaFeed();

    expect(result.articles[0]?.thumbnailUrl).toBeNull();
  });

  it("falls back to link as id when guid is absent", async () => {
    mockParseURL.mockResolvedValueOnce({
      items: [
        {
          title: "Artemis Link ID",
          link: "https://nasa.gov/link-id",
          categories: ["Artemis"],
          isoDate: "2026-04-03T10:00:00Z",
        },
      ],
    });

    const result = await fetchNasaFeed();

    expect(result.articles[0]?.id).toBe("https://nasa.gov/link-id");
  });
});
