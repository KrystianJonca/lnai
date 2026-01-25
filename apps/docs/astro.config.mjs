import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  site: "https://krystianjonca.github.io",
  base: "/lnai",
  integrations: [
    starlight({
      title: "LNAI",
      description:
        "CLI tool that syncs a unified .ai/ config to native formats for AI coding tools",
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/KrystianJonca/lnai",
        },
      ],
      sidebar: [
        {
          label: "Getting Started",
          autogenerate: { directory: "getting-started" },
        },
        {
          label: "Reference",
          autogenerate: { directory: "reference" },
        },
        {
          label: "Tools",
          autogenerate: { directory: "tools" },
        },
      ],
    }),
  ],
});
