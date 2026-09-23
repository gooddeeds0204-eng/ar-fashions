import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AS Fashions",
    short_name: "AS Fashions",
    description:
      "Fashion shopping for retail customers and approved resellers.",
    start_url: "/",
    display: "standalone",
    background_color: "#FAF7F0",
    theme_color: "#031B14",
  };
}
