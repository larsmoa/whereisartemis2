import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://whereisartemis.com",
      lastModified: new Date(),
      changeFrequency: "always",
      priority: 1,
    },
  ];
}
