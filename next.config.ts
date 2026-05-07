import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Suppress TypeScript errors during Vercel builds
  typescript: {
    ignoreBuildErrors: true,
  },

  // Allow Next/Image to load images from Supabase Storage
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pkmmiozhmvjvevmihsjn.supabase.co",
        port:     "",
        pathname: "/storage/v1/object/public/**",
      },
      // Legacy project (keep during transition)
      {
        protocol: "https",
        hostname: "hknctnpgrfkpvvfjwpeh.supabase.co",
        port:     "",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
