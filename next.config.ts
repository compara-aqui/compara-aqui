import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images-na.ssl-images-amazon.com" },
      { protocol: "https", hostname: "m.media-amazon.com" },
      { protocol: "https", hostname: "images.kabum.com.br" },
      { protocol: "https", hostname: "americanas.vteximg.com.br" },
    ],
  },
};

export default nextConfig;