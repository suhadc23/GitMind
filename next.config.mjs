/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['localhost', 'img.clerk.com'],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '200mb',
    },
  },
  // Allow large file uploads to API route handlers (default is 10MB)
  middlewareClientMaxBodySize: 250 * 1024 * 1024, // 250MB in bytes
}

export default nextConfig
