import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'export',
  // Birden fazla root layout ile tek bir global 404 sayfası için gerekli.
  experimental: { globalNotFound: true },
  // Statik çıktıda optimizasyon sunucusu yok; görseller doğrudan TMDB boyutlarından gelir.
  images: { loader: 'custom', loaderFile: './src/lib/tmdb-image-loader.ts' },
}

export default nextConfig
