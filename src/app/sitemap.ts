import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/brand";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: absoluteUrl(),
      changeFrequency: "daily",
      priority: 1,
      images: [absoluteUrl("/social.png")],
    },
    { url: absoluteUrl("/about"), changeFrequency: "monthly", priority: 0.6 },
  ];
}
