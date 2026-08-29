import type { MetadataRoute } from "next";

/** Panel admin — jangan pernah diindeks. */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
