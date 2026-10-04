import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'export',
  // Birden fazla root layout ile tek bir global 404 sayfası için gerekli.
  experimental: { globalNotFound: true },
}

export default nextConfig
