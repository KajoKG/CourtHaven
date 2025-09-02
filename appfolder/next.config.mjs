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
};

export default nextConfig;
