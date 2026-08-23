/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Vercel's build image blocks the postinstall script of unrs-resolver
    // (a native, per-platform resolver used transitively by
    // eslint-import-resolver-typescript, itself pulled in by
    // eslint-config-next) unless it's explicitly approved there — without
    // its native binary, ESLint crashes resolving "@/*" imports partway
    // through "Linting and checking validity of types", killing the build
    // with no readable error. This only skips ESLint during `next build`;
    // `npm run lint` still runs it normally for local/CI use. TypeScript's
    // own type-checking (the actual safety net) is untouched — no
    // typescript.ignoreBuildErrors here, since tsc isn't what's crashing.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
