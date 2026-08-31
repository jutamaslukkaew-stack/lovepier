/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactStrictMode: true,
  // sharp is a native addon — it must be require()d from node_modules at
  // runtime, never traced/bundled into the serverless function. Next lists it
  // as an external by default, but spell it out so the /api/admin/upload and
  // menu-import routes keep working across bundler (webpack/Turbopack) and
  // Next-version changes. A bundled sharp fails to load in prod and the route
  // 500s with a non-JSON body, which the client can only show as "Upload failed".
  serverExternalPackages: ['sharp'],
  images: {
    // Supabase Storage public bucket — required so next/image will optimize
    // (rather than reject) event/menu/promotion images served from Supabase.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
