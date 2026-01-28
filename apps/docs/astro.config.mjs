import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  site: "https://lnai.sh",
  integrations: [
    starlight({
      title: "LNAI",
      logo: {
        light: "./public/lnai_dark_transparent.png",
        dark: "./public/lnai_white_transparent.png",
        alt: "LNAI Logo",
        replacesTitle: true,
      },
      description:
        "CLI tool that syncs a unified .ai/ config to native formats for AI coding tools",
      social: [
        {
          icon: "npm",
          label: "npm",
          href: "https://www.npmjs.com/package/lnai",
        },
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
