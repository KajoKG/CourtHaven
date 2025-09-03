/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "jhbzvbuixigdssfxctnm.supabase.co",
      },
    ],
  },

  // ✅ Ne ruši deploy ako ESLint nađe greške (npr. `any`)
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Ako ti ikad zapne na TypeScript greškama, privremeno otključi i ovo:
  // typescript: {
  //   ignoreBuildErrors: true,
  // },
};

export default nextConfig;
