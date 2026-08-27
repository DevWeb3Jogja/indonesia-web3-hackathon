import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://indonesia-web3-hackathon.vercel.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Halaman personal (butuh wallet) tidak perlu di-crawl.
      disallow: ["/id/profile", "/en/profile", "/id/team", "/en/team"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
