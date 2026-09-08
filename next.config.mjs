import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  webpack: (config) => {
    // pdfjs-dist's bundled build (build/pdf.js) contains a Node-only
    // fallback path (`NodeCanvasFactory`) that unconditionally
    // `require("canvas")` for server-side rendering — we never take that
    // path (PdfViewer.tsx renders to a real browser <canvas> instead), and
    // the `canvas` native package isn't installed. pdfjs-dist itself
    // declares `"browser": { "canvas": false }` in its package.json to tell
    // bundlers to skip this, but Next's webpack config doesn't pick that
    // remap up, so it's aliased explicitly here. Applied unconditionally
    // (not just `!isServer`) because Next's server/RSC compiler also
    // statically resolves the module graph of "use client" components
    // (like PdfViewer) to build the client-reference manifest, even though
    // it never executes that code.
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };
    return config;
  },
};

export default withNextIntl(nextConfig);
