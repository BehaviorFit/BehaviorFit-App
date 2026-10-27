// Lets you install BehaviorFit as a desktop app from Chrome or Edge
// (address bar → "Install BehaviorFit"), so it opens in its own window.
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "BehaviorFit",
    short_name: "BehaviorFit",
    description: "Clients and social media command center",
    start_url: "/social",
    display: "standalone",
    background_color: "#f9fafb",
    theme_color: "#1d4ed8",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
