import { NextResponse } from "next/server";

export const revalidate = 60; // Revalidate every minute

export interface ScrapedImage {
  id: string;
  title: string;
  url: string;
  thumbnailUrl: string;
  publishedAt: string;
}

export async function GET(): Promise<NextResponse> {
  try {
    // 1. Fetch the main Artemis II Multimedia page
    const multimediaRes = await fetch("https://www.nasa.gov/artemis-ii-multimedia/", {
      next: { revalidate: 60 },
    });

    if (!multimediaRes.ok) {
      throw new Error(`Failed to fetch multimedia page: ${multimediaRes.status}`);
    }

    const multimediaHtml = await multimediaRes.text();

    // 2. Find the link to the Journey to the Moon gallery (which has the latest images)
    // We look for the specific gallery that contains the latest in-flight images
    const galleryMatch = multimediaHtml.match(/href="([^"]*journey-to-the-moon[^"]*)"/);
    const galleryUrl = galleryMatch?.[1] ?? "https://www.nasa.gov/gallery/journey-to-the-moon/";

    // 3. Fetch the gallery page
    const galleryRes = await fetch(galleryUrl, {
      next: { revalidate: 60 },
    });

    if (!galleryRes.ok) {
      throw new Error(`Failed to fetch gallery page: ${galleryRes.status}`);
    }

    const galleryHtml = await galleryRes.text();

    const images: ScrapedImage[] = [];

    // 4. Extract images from the gallery
    // The gallery items are typically in .hds-gallery-item-single
    // We want both images and videos (which often have image thumbnails)
    const itemBlocks = galleryHtml.split('class="hds-gallery-item-single');

    // Skip the first split as it's the HTML before the first item
    for (let i = 1; i < itemBlocks.length; i++) {
      const itemHtml = itemBlocks[i];
      if (!itemHtml) continue;

      const hrefMatch = itemHtml.match(/href="([^"]+)"/);
      const captionMatch = itemHtml.match(/class="hds-gallery-item-caption[^>]*>([\s\S]*?)<\/div>/);
      const imgMatch = itemHtml.match(/<img[^>]+src="([^"]+)"/);
      const videoMatch = itemHtml.match(/<video[^>]*>\s*<source[^>]+src="([^"]+)"/);
      const posterMatch = itemHtml.match(/<video[^>]+poster="([^"]*)"/);

      if (!hrefMatch || (!imgMatch && !videoMatch)) continue;

      const pageUrl = hrefMatch[1];
      const imgUrl = imgMatch?.[1] ?? "";
      const videoUrl = videoMatch?.[1] ?? "";
      const posterUrl = posterMatch?.[1] ?? "";

      if (!pageUrl || (!imgUrl && !videoUrl)) continue;

      const rawTitle = captionMatch?.[1]?.trim() ?? "Artemis II Media";

      // Decode HTML entities in title (basic ones)
      const title = rawTitle
        .replace(/&#039;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">");

      // For videos, the poster attribute is often empty in the NASA gallery HTML.
      // We can try to extract a thumbnail from the video URL if it follows a predictable pattern,
      // or we can use a generic fallback. The MissionFeed component handles empty thumbnails by showing a fallback.
      const thumbnailUrl = (imgUrl || posterUrl).replace(/&#038;/g, "&");

      // Extract the ID from the URL (e.g., amf-art002e008487 or video-detail/...)
      const idMatch = pageUrl.match(/(?:image-detail|video-detail)\/([^/]+)/);
      const id = idMatch?.[1] ?? `media-${Math.random().toString(36).substring(7)}`;

      let publishedAt = new Date().toISOString();
      const dateMatch = title.match(
        /\((Jan[a-z]*|Feb[a-z]*|Mar[a-z]*|Apr[a-z]*|May|Jun[a-z]*|Jul[a-z]*|Aug[a-z]*|Sep[a-z]*|Oct[a-z]*|Nov[a-z]*|Dec[a-z]*)\s+\d{1,2},\s+\d{4}\)/i,
      );
      if (dateMatch) {
        const parsedDate = new Date(dateMatch[0].replace(/[()]/g, ""));
        if (!isNaN(parsedDate.getTime())) {
          publishedAt = parsedDate.toISOString();
        }
      }

      // The full image URL is usually the thumbnail URL without the query params
      // e.g. ...~large.jpg?w=1920... -> ...~large.jpg
      const url = thumbnailUrl ? (thumbnailUrl.split("?")[0] ?? thumbnailUrl) : videoUrl;

      // If thumbnailUrl is empty (e.g. video with empty poster), we don't want to pass the video URL as the image source
      // NASA often hosts a thumbnail with the same name as the mp4 but ending in .jpg
      // If we don't have a thumbnail, we can use a generic placeholder or leave it empty to show the fallback
      const finalThumbnailUrl = thumbnailUrl || "";

      // If it's a video, we might want to link to the page instead of the raw mp4
      const finalUrl = url.endsWith(".mp4")
        ? pageUrl.startsWith("http")
          ? pageUrl
          : `https://www.nasa.gov${pageUrl}`
        : url;

      images.push({
        id,
        title,
        url: finalUrl,
        thumbnailUrl: finalThumbnailUrl,
        publishedAt,
      });
    }

    // If we couldn't find any images in the specific gallery, we might want to fallback to other galleries
    // But for now, returning what we found
    return NextResponse.json({ images: images });
  } catch {
    return NextResponse.json({ error: "Failed to fetch latest images" }, { status: 500 });
  }
}
