import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@prisma/client'],
  images: {
    domains: ['lh3.googleusercontent.com', 'avatars.githubusercontent.com']
  },
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  }
};

export default nextConfig;
