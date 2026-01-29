import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  site: "https://lnai.sh",
  integrations: [
    starlight({
      title: "LNAI - Unified AI Configuration Management for Coding Tools",
      logo: {
        light: "./public/lnai_dark_transparent.png",
        dark: "./public/lnai_white_transparent.png",
        alt: "LNAI Logo",
        replacesTitle: true,
      },
      description:
        "LNAI syncs unified .ai/ configurations to native formats for AI coding tools like Claude Code, Cursor, and Copilot. Define once, use everywhere.",
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
      head: [
        {
          tag: "meta",
          attrs: {
            property: "og:image",
            content: "https://lnai.sh/og_image.png",
          },
        },
        {
          tag: "meta",
          attrs: {
            name: "twitter:image",
            content: "https://lnai.sh/og_image.png",
          },
        },
        {
          tag: "script",
          attrs: {
            type: "application/ld+json",
          },
          content: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Organization",
                "@id": "https://lnai.sh/#organization",
                name: "LNAI",
                url: "https://lnai.sh",
                logo: {
                  "@type": "ImageObject",
                  url: "https://lnai.sh/lnai_dark_transparent.png",
                },
                sameAs: [
                  "https://github.com/KrystianJonca/lnai",
                  "https://www.npmjs.com/package/lnai",
                ],
              },
              {
                "@type": "WebSite",
                "@id": "https://lnai.sh/#website",
                url: "https://lnai.sh",
                name: "LNAI - Unified AI Configuration Management for Coding Tools",
                description:
                  "LNAI syncs unified .ai/ configurations to native formats for AI coding tools like Claude Code, Cursor, and Copilot. Define once, use everywhere.",
                publisher: {
                  "@id": "https://lnai.sh/#organization",
                },
              },
              {
                "@type": "SoftwareApplication",
                "@id": "https://lnai.sh/#software",
                name: "LNAI",
                applicationCategory: "DeveloperApplication",
                operatingSystem: "Windows, macOS, Linux",
                offers: {
                  "@type": "Offer",
                  price: "0",
                  priceCurrency: "USD",
                },
                url: "https://lnai.sh",
                description:
                  "CLI tool that syncs unified .ai/ configurations to native formats for AI coding tools.",
              },
            ],
          }),
        },
      ],
    }),
  ],
});
