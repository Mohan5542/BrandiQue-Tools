import type { MetadataRoute } from "next";
import { tools, siteUrl } from "@/lib/registry";
export const dynamic = "force-static";
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    "",
    "tools",
    "about",
    "privacy",
    "terms",
    "contact",
    ...tools.map((t) => "tools/" + t.slug),
  ].map((path) => ({
    url: siteUrl + "/" + (path ? path + "/" : ""),
    changeFrequency: "monthly",
    priority: path === "" ? 1 : path.startsWith("tools/") ? 0.8 : 0.5,
  }));
}
