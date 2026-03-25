import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Define o root correto para o Turbopack (evita conflito com package-lock.json em C:\Users\Pedro)
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
