/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  // Standalone output produces a minimal Node server suitable for the Fly.io
  // container we'll build later. No effect in `next dev`.
  output: 'standalone',
  // Dev-only rewrite so the frontend can call /api/* paths that transparently
  // hit the Bun backend on port 8080. In prod, the backend lives on a separate
  // host so this rewrite is skipped.
  async rewrites() {
    if (process.env.NODE_ENV !== 'development') return [];
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:8080/:path*',
      },
    ];
  },
};

export default config;
